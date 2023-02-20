import NRP from "node-redis-pubsub";
import redis from "redis";
import { StreamMessage } from "./proto/ecommerce/StreamMessage";
import { User } from "./proto/ecommerce/User";

const client = redis.createClient();

client.on("error", console.error);
client.on("connect", console.log);


const REDIS_KEYS = {
    broadcastRoom: "room:0:messages",
    users: "users",
}

type errCB = (err: Error | null) => void;
type replyCB<T> = (err: Error | null, reply: T) => void;

export const addUser = (user: User, fn: errCB) => {
    client.rpush(REDIS_KEYS.users, JSON.stringify(user))  
}

export const listUsers = (fn: replyCB<User[]>) => {
    client.lrange(REDIS_KEYS.users, 0, -1, (err, reply) => {
        if (err) return fn(err, []);
        const users : Array<User> = [];
        for (const r of reply) {
            users.push(JSON.parse(r));
        }
        fn(null, users);
    });
}

export const findUser = (userId: number, fn: replyCB<User>) => {
    listUsers((err, users) => {
        if (err) return fn(err, {} as User);
        const i = users.findIndex((e) => e.id === userId)
        fn(null, users[i]);
    })
}

export const updateUser = (user: User, fn: errCB) => {
    listUsers((err, users) => {
        if (err) return fn(err)
        const i = users.findIndex((e) => e.id === user.id)
        if (i === -1) return fn(Error('cannot find user'))
        client.lset(REDIS_KEYS.users, i, JSON.stringify(user), fn)
    })
}

export const nrp = NRP({
    emitter: redis.createClient(),
    receiver: redis.createClient(),
})

export const listMessagesFromMainRoom = (done?:(data: Array<StreamMessage>) => void) => {
    client.lrange(REDIS_KEYS.broadcastRoom, 0, -1, (err, reply) => {
        const msgs : Array<StreamMessage> = [];
        for (const res of reply) {
            msgs.push(JSON.parse(res));
        }
        done && done(msgs);
    })
}

export const addChatToMainRoom = (msg: StreamMessage, fn: errCB) => {
    client.rpush(REDIS_KEYS.broadcastRoom, JSON.stringify(msg), fn);
}

export const addMessageToMainRoom = (msg: StreamMessage, fn: errCB) => {
    client.rpush(REDIS_KEYS.broadcastRoom, JSON.stringify(msg), fn);
}