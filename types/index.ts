export interface Expert {
  id: string;
  name: string;
  title: string;
  category: string;
  bio: string;
  location: string;
  website?: string;
  linkedin?: string;
  verified: boolean;
  listedOnMarketplace: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt?: string;
}

export interface Message {
  id: string;
  from: string;
  fromId: string;
  toId: string;
  subject: string;
  content: string;
  timestamp: string;
  unread: boolean;
}

export interface Connection {
  id: string;
  userId: string;
  expertId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

