export type UserDTO = {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
};

export type RegisterDTO = {
  email: string;
  password: string;
  name: string;
};

export type LoginDTO = {
  email: string;
  password: string;
};

export type AuthResponseDTO = {
  user: UserDTO;
  token: string;
};