import { Quaternion, Vector3 } from "three";

export interface Pov {
    id: string;
    name?: string;
    position?: Vector3;
    rotation?: Quaternion;
  }