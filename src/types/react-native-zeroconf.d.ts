declare module 'react-native-zeroconf' {
  type Listener = (...args: any[]) => void;

  export default class Zeroconf {
    on(event: string, listener: Listener): void;
    scan(type: string, protocol?: string, domain?: string): void;
    stop(): void;
    publishService(
      type: string,
      protocol: string,
      domain: string,
      name: string,
      port: number,
    ): void;
  }
}
