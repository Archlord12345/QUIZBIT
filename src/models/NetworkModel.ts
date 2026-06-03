import Zeroconf from 'react-native-zeroconf';
import dgram from 'react-native-udp';
import { Buffer } from 'buffer';

class NetworkModel {
  private zeroconf = new Zeroconf();
  private socket: any;
  private port = 12345;
  private peers: string[] = [];

  constructor() {
    this.zeroconf.on('start', () => console.log('Discovery started'));
    this.zeroconf.on('found', name => console.log('Found peer:', name));
    this.zeroconf.on('resolved', service => {
      console.log('Resolved peer:', service.host, service.addresses);
      if (service.addresses && service.addresses.length > 0) {
        this.peers.push(service.addresses[0]);
      }
    });
  }

  startDiscovery() {
    this.zeroconf.scan('quizbit', 'tcp', 'local.');
  }

  stopDiscovery() {
    this.zeroconf.stop();
  }

  publishService(name: string) {
    this.zeroconf.publishService('quizbit', 'tcp', 'local.', name, this.port);
  }

  initSocket() {
    this.socket = dgram.createSocket({ type: 'udp4' });
    this.socket.bind(this.port);
    this.socket.on('message', (msg: any, rinfo: any) => {
      console.log(`Received message: ${msg} from ${rinfo.address}`);
    });
  }

  sendMessage(ip: string, message: string) {
    const buf = Buffer.from(message);
    this.socket.send(buf, 0, buf.length, this.port, ip, (err: any) => {
      if (err) console.error(err);
    });
  }
}

export default new NetworkModel();
