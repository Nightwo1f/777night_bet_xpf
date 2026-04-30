import { Injectable } from '@nestjs/common';

export type DemoUser = {
  id: number;
  email: string;
  passwordHash: string;
};

@Injectable()
export class UsersService {
  private readonly users: DemoUser[] = [
    {
      id: 1,
      email: 'test@test.com',
      passwordHash:
        '$2b$10$nttIpeZBHXb8tkeEJdk7ROPN927Mh/TUCeBrghGxtX6BboV0j6PH2',
    },
  ];

  findByEmail(email: string) {
    return this.users.find((user) => user.email === email);
  }

  findById(id: number) {
    return this.users.find((user) => user.id === id);
  }
}
