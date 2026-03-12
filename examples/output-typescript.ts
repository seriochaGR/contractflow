export interface IUserDto {
  id: string;
  displayName: string | null;
  birthDate: Date | null;
  roles: string[];
}

export interface ITeamDto {
  name: string;
  members: IUserDto[];
}
