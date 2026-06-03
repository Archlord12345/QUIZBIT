import NetworkModel from '../models/NetworkModel';

class MultiplayerController {
  async hostGame(playerName: string) {
    NetworkModel.initSocket();
    NetworkModel.publishService(playerName);
  }

  async joinGame() {
    NetworkModel.initSocket();
    NetworkModel.startDiscovery();
  }

  sendGameState(_state: any) {
    // Broadcast to all known peers
  }
}

export default new MultiplayerController();
