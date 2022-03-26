import { Quaternion, Vector3 } from "three";

//@param id: wss identifier
//@param name: lens identifier
//@@param position: position in game
//@param rotation: rotation in game
//@param audio id: spatial audio identifier
export interface Pov {
    id: string;
    name?: string;
    position?: Vector3;
    rotation?: Quaternion;
    audio_id?: string;
    
  }