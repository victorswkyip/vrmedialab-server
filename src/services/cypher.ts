export class Cypher {

    constructor() { }

    private broadcastRegex: any = /^broadcast\:/; //this regex requires for deserialization to be json.parsed twice because this string is already in json.stringify form!
    private worldStateRegex: any = /^worldstate\:/; //this regex requires for deserialization to be json.parsed twice because this string is already in json.stringify form!

    public detectBroadcast(message: string): boolean {
        return this.broadcastRegex.test((message));
    }

    public deserializeBroadcast(message: string): string {
       return message.replace(this.broadcastRegex, '');
    }

    public detectWorldState(message: string): boolean {
        return this.worldStateRegex.test((message));
    }

    public deserializeWorldState(message: string): string {
       return message.replace(this.worldStateRegex, '');
    }
}