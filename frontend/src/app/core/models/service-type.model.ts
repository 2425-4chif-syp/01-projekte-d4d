export interface ServiceType {
  id: number;
  name: string;
}

export interface Market {
  id: number;
  offer: number;
  serviceType: ServiceType;
  user: {
    id: number;
    name: string;
  };
}
