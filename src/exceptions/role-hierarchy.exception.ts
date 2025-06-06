export class RoleHierarchyException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RoleHierarchyException';
  }
}
