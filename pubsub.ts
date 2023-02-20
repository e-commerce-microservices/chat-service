import { StreamMessage } from "./proto/ecommerce/StreamMessage";
import { nrp } from "./store";

const REDIS_CHANNELS = {
    mainRoom: "MAIN_ROOM",
    userChange: "USER_CHANGE",
}

export const emitMainRoomChatUpdate = (msg: StreamMessage) => {
    nrp.emit(REDIS_CHANNELS.mainRoom, JSON.stringify(msg))
}

export const listenMainRoomChatUpdate = (fn: (data: string, channel: string) => void) => nrp.on(REDIS_CHANNELS.mainRoom,fn);
