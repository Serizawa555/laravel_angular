export interface User {
  id: number;
  name: string;
  email: string;
  roles: string[];
  /** Flat permission names, or ['*'] for superadmin. Drives UI gating only. */
  permissions: string[];
}

/** API Resources wrap the payload in `data`. */
export interface Resource<T> {
  data: T;
}

export interface Credentials {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}
