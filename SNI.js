const grpc = require('@grpc/grpc-js');
const sniMessages = require('./sni/sni_pb');
const sniServices = require('./sni/sni_grpc_pb');

module.exports = class SNI {
  static supportedMemoryMaps = {
    LOROM: sniMessages.MemoryMapping.LOROM, // ALttP
    HIROM: sniMessages.MemoryMapping.HIROM, // Super Metroid
    EXHIROM: sniMessages.MemoryMapping.EXHIROM, // ALttP + SM

    // Not supported yet
    // BSX: sniMessages.BSX,
  };

  static supportedAddressSpaces = {
    FXPAKPRO: sniMessages.AddressSpace.FXPAKPRO,
    SNESABUS: sniMessages.AddressSpace.SNESABUS,
  };

  constructor(serverAddress='127.0.0.1:8191') {
    this.serverAddress = serverAddress;
    this.sniClient = new sniServices.DevicesClient(this.serverAddress, grpc.credentials.createInsecure());
    this.devicesList = [];
    this.currentDevice = null;
    this.addressSpace = null;
    this.memoryMap = null;
  }

  fetchDevices = () => new Promise((resolve, reject) => {
    this.sniClient.listDevices(new sniMessages.DevicesRequest(), (err, response) => {
      if (err) { return reject(err); }
      if (!response) { return resolve([]); }
      const devicesList = [];
      for (let device of response.getDevicesList()) {
        devicesList.push({
          uri: device.getUri(),
          displayName: device.getDisplayname(),
          type: device.getKind(),
          capabilities: device.getCapabilitiesList(),
        });
      }
      this.devicesList = devicesList;
      resolve(devicesList);
    });
  });

  setDevice = (device) => {
    const matchingDevices = this.devicesList.filter(existing => existing.uri === device.uri);
    switch (matchingDevices.length) {
      case 0:
        throw new Error(`Requested device ${device} does not exist in devicesList.`);
      case 1:
        return this.currentDevice = device;
      default:
        throw new Error("More than one existing device matches the provided device URI.");
    }
  }

  /**
   * Set the address space to be used when communicating with the SNES.
   * If you need to communicate with an SD2SNES or FXPak Pro, or you are working with software which already contains
   * memory addresses for use with QUsb2Snes or Usb2Snes, you should use the FXPAKPRO address space.
   * Otherwise, you probably want SNESABUS.
   *
   * From the developer of SNI (JSD):
   * FXPAKPRO makes the ROM data appear linearly and will be less of a mindfuck to handle if you expect ROM data to
   * be linearly mapped
   * SNESABUS will spread the ROM data all over the memory map and be mirrored several times as well
   * If you're literally a SNES ASM god, use SNESABUS space because FXPAKPRO will confuse you
   * If you're a PC programming god, use FXPAKPRO because SNESABUS will infuriate you
   * @param addressSpace
   */
  setAddressSpace = (addressSpace) => {
    if (!Object.values(SNI.supportedAddressSpaces).includes(addressSpace)) {
      throw new Error(`Requested address space ${addressSpace} is not among supported address spaces. ` +
        `Supported spaces include: ${SNI.supportedAddressSpaces}`);
    }
    this.addressSpace = addressSpace;
  };

  /**
   * Set the memory map type to be used when requesting against the SNES
   * @param mapType 0 = Unknown, 1 = HiROM, 2 = LoROM, 3 = ExHiROM, 4 = BSX
   */
  setMemoryMap = (mapType) => {
    if (!Object.values(SNI.supportedMemoryMaps).includes(mapType)) {
      throw new Error(`Requested mapping type ${mapType} is not among supported mapping types. Supported ` +
        `types include: ${JSON.stringify(SNI.supportedMemoryMaps)}`);
    }

    this.memoryMap = mapType;
  };

  /**
   * @param address Hex address at which to begin reading from the ROM
   * @param length Length in bytes to read
   * @return Promise which resolves to a Uint8Array of bytes read from the device
   */
  readFromAddress = (address, length) => new Promise((resolve, reject) => {
    if (!this.currentDevice) { return reject("No device selected."); }
    if (this.addressSpace === null) { return reject("No address space selected."); }
    if (this.memoryMap === null) { return reject("No memory map selected."); }

    const readRequest = new sniMessages.SingleReadMemoryRequest();
    readRequest.setUri(this.currentDevice.uri);
    const rmr = new sniMessages.ReadMemoryRequest();
    rmr.setRequestaddress(address);
    rmr.setRequestaddressspace(this.addressSpace);
    rmr.setRequestmemorymapping(this.memoryMap);
    rmr.setSize(length);
    readRequest.setRequest(rmr);
    const memory = new sniServices.DeviceMemoryClient(this.serverAddress, grpc.credentials.createInsecure());
    memory.singleRead(readRequest, (err, response) => {
      if (err) { return reject(err); }
      if (!response) { return reject('No response.'); }
      const responseData = response.getResponse().getData();
      return resolve(responseData);
    });
  });

  writeToAddress = (address, data) => new Promise((resolve, reject) => {
    if (!this.currentDevice) { return reject("No device selected."); }
    if (this.addressSpace === null) { return reject("No address space selected."); }
    if (this.memoryMap === null) { return reject("No memory map selected."); }
    if (!data instanceof Uint8Array) { reject("Data must be a Uint8Array."); }

    const writeRequest = new sniMessages.SingleWriteMemoryRequest();
    writeRequest.setUri(this.currentDevice.uri);
    const wmr = new sniMessages.WriteMemoryRequest();
    wmr.setRequestaddress(address);
    wmr.setRequestaddressspace(this.addressSpace);
    wmr.setRequestmemorymapping(this.memoryMap);
    wmr.setData(Buffer.from(data));
    writeRequest.setRequest(wmr);
    const memory = new sniServices.DeviceMemoryClient(this.serverAddress, grpc.credentials.createInsecure());
    memory.singleWrite(writeRequest, (err, response) => {
      if (err) { return reject(err); }
      if (!response) { return reject('No response.'); }
      return resolve(response);
    });
  });
}