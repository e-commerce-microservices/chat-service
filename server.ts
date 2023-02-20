import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";
import { ProtoGrpcType } from "./proto/chat_service";
import { ChatServiceHandlers } from "./proto/ecommerce/ChatService";
import { StreamMessage, StreamMessage__Output } from "./proto/ecommerce/StreamMessage";
import { emitMainRoomChatUpdate, listenMainRoomChatUpdate } from "./pubsub";
import { addMessageToMainRoom, findUser, listMessagesFromMainRoom } from "./store";

const PROTO_FILE = "./proto/chat_service.proto";
const packageDef = protoLoader.loadSync(path.resolve(__dirname,PROTO_FILE ));
const grpcObj = grpc.loadPackageDefinition(packageDef) as unknown as ProtoGrpcType;

const chatPackage = grpcObj.ecommerce;

function main() {
    const service = getService();
    service.bindAsync("0.0.0.0:8082", grpc.ServerCredentials.createInsecure(),(err, port) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log("Your server as started on port 8082");
        service.start();
    })
}
main()

const userIdToMsgStream = new Map<number,grpc.ServerWritableStream<StreamMessage__Output,StreamMessage>>();

function getService() {
    const server = new grpc.Server();
    server.addService(chatPackage.ChatService.service, {
        Ping: (req, res) => {
            res(null, {message: "Pong"})
        },
        // ChatInitiate: (req, res) => {
        //     const sessionName = req.request.name || ''
        //     const avatar = req.request.avatarUrl || ''
        //     if (!sessionName || !avatar) return res(new Error("Name and avatar is required"))
        //     // get id#id key

        //     // reach into db
        //     // check if user with name already exist
        //     //
        //     // if use is online so then return an error
        //     // if not then get them online and send the user number back
        // },
        SendMessage: (req, res) => {
            const {id = -1, message = '' } = req.request
            if (!id || !message) return res(new Error("i don'w known who you are"))
            findUser(id, (err, user) => {
                if(err) return res(err);

                const msg:StreamMessage = {
                    id: id,
                    message: req.request.message,
                }

                addMessageToMainRoom(msg, (err) => {
                    if (err) return res(err);
                    emitMainRoomChatUpdate(msg);
                    res(null);
                });
            })
        },
        ChatStream: (req) => {
            const {id = -1} = req.request
            if (!id) return req.end()
            findUser(id, (err, user) => {
                if(err) return req.end()
                listMessagesFromMainRoom((msgs) => {
                    for (const msg of msgs) {
                        req.write(msg)
                    }
                    userIdToMsgStream.set(id, req);
                })
            });
            req.on("cancelled", () => {
                userIdToMsgStream.delete(id)
            })
        },
    } as ChatServiceHandlers); 

    return server
}

function setupPubSub() {
    listenMainRoomChatUpdate((data, channel) => {
        const msg = JSON.parse(data) as StreamMessage
        for (const [,stream] of userIdToMsgStream) {
            stream.write(msg);
        }
    })
}