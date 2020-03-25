"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("../models");
const sequelize_1 = require("sequelize");
const underscore_1 = require("underscore");
const hub_1 = require("../hub");
const socket = require("../utils/socket");
const jsonUtils = require("../utils/json");
const helpers = require("../helpers");
const res_1 = require("../utils/res");
const lock_1 = require("../utils/lock");
const constants = require(__dirname + '/../../config/constants.json');
const getMessages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const dateToReturn = req.query.date;
    if (!dateToReturn) {
        return getAllMessages(req, res);
    }
    console.log(dateToReturn);
    const owner = yield models_1.models.Contact.findOne({ where: { isOwner: true } });
    // const chatId = req.query.chat_id
    let newMessagesWhere = {
        date: { [sequelize_1.Op.gte]: dateToReturn },
        [sequelize_1.Op.or]: [
            { receiver: owner.id },
            { receiver: null }
        ]
    };
    let confirmedMessagesWhere = {
        updated_at: { [sequelize_1.Op.gte]: dateToReturn },
        status: constants.statuses.received,
        sender: owner.id
    };
    // if (chatId) {
    // 	newMessagesWhere.chat_id = chatId
    // 	confirmedMessagesWhere.chat_id = chatId
    // }
    const newMessages = yield models_1.models.Message.findAll({ where: newMessagesWhere });
    const confirmedMessages = yield models_1.models.Message.findAll({ where: confirmedMessagesWhere });
    const chatIds = [];
    newMessages.forEach(m => {
        if (!chatIds.includes(m.chatId))
            chatIds.push(m.chatId);
    });
    confirmedMessages.forEach(m => {
        if (!chatIds.includes(m.chatId))
            chatIds.push(m.chatId);
    });
    let chats = chatIds.length > 0 ? yield models_1.models.Chat.findAll({ where: { deleted: false, id: chatIds } }) : [];
    const chatsById = underscore_1.indexBy(chats, 'id');
    res.json({
        success: true,
        response: {
            new_messages: newMessages.map(message => jsonUtils.messageToJson(message, chatsById[parseInt(message.chatId)])),
            confirmed_messages: confirmedMessages.map(message => jsonUtils.messageToJson(message, chatsById[parseInt(message.chatId)]))
        }
    });
    res.status(200);
    res.end();
});
exports.getMessages = getMessages;
const getAllMessages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const messages = yield models_1.models.Message.findAll({ order: [['id', 'asc']] });
    const chatIds = messages.map(m => m.chatId);
    console.log('=> getAllMessages, chatIds', chatIds);
    let chats = chatIds.length > 0 ? yield models_1.models.Chat.findAll({ where: { deleted: false, id: chatIds } }) : [];
    const chatsById = underscore_1.indexBy(chats, 'id');
    res_1.success(res, {
        new_messages: messages.map(message => jsonUtils.messageToJson(message, chatsById[parseInt(message.chatId)])),
        confirmed_messages: []
    });
});
const sendMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // try {
    // 	schemas.message.validateSync(req.body)
    // } catch(e) {
    // 	return failure(res, e.message)
    // }
    const { contact_id, text, remote_text, chat_id, remote_text_map, } = req.body;
    console.log('[sendMessage]');
    var date = new Date();
    date.setMilliseconds(0);
    const owner = yield models_1.models.Contact.findOne({ where: { isOwner: true } });
    const chat = yield helpers.findOrCreateChat({
        chat_id,
        owner_id: owner.id,
        recipient_id: contact_id,
    });
    const remoteMessageContent = remote_text_map ? JSON.stringify(remote_text_map) : remote_text;
    const msg = {
        chatId: chat.id,
        type: constants.message_types.message,
        sender: owner.id,
        date: date,
        messageContent: text,
        remoteMessageContent,
        status: constants.statuses.pending,
        createdAt: date,
        updatedAt: date
    };
    // console.log(msg)
    const message = yield models_1.models.Message.create(msg);
    res_1.success(res, jsonUtils.messageToJson(message, chat));
    helpers.sendMessage({
        chat: chat,
        sender: owner,
        type: constants.message_types.message,
        message: {
            id: message.id,
            content: remote_text_map || remote_text || text
        }
    });
});
exports.sendMessage = sendMessage;
const receiveMessage = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('received message', { payload });
    var date = new Date();
    date.setMilliseconds(0);
    const total_spent = 1;
    const { owner, sender, chat, content, msg_id } = yield helpers.parseReceiveParams(payload);
    if (!owner || !sender || !chat) {
        return console.log('=> no group chat!');
    }
    const text = content;
    const message = yield models_1.models.Message.create({
        chatId: chat.id,
        type: constants.message_types.message,
        asciiEncodedTotal: total_spent,
        sender: sender.id,
        date: date,
        messageContent: text,
        createdAt: date,
        updatedAt: date,
        status: constants.statuses.received
    });
    console.log('saved message', message.dataValues);
    socket.sendJson({
        type: 'message',
        response: jsonUtils.messageToJson(message, chat)
    });
    hub_1.sendNotification(chat, sender.alias, 'message');
    sendConfirmation({ chat, sender: owner, msg_id });
});
exports.receiveMessage = receiveMessage;
const sendConfirmation = ({ chat, sender, msg_id }) => {
    helpers.sendMessage({
        chat,
        sender,
        message: { id: msg_id },
        type: constants.message_types.confirmation,
    });
};
const receiveConfirmation = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('received confirmation', { payload });
    const dat = payload.content || payload;
    const chat_uuid = dat.chat.uuid;
    const msg_id = dat.message.id;
    const sender_pub_key = dat.sender.pub_key;
    const owner = yield models_1.models.Contact.findOne({ where: { isOwner: true } });
    const sender = yield models_1.models.Contact.findOne({ where: { publicKey: sender_pub_key } });
    const chat = yield models_1.models.Chat.findOne({ where: { uuid: chat_uuid } });
    // new confirmation logic
    if (msg_id) {
        lock_1.default.acquire('confirmation', function (done) {
            return __awaiter(this, void 0, void 0, function* () {
                console.log("update status map");
                const message = yield models_1.models.Message.findOne({ where: { id: msg_id } });
                if (message) {
                    let statusMap = {};
                    try {
                        statusMap = JSON.parse(message.statusMap || '{}');
                    }
                    catch (e) { }
                    statusMap[sender.id] = constants.statuses.received;
                    yield message.update({
                        status: constants.statuses.received,
                        statusMap: JSON.stringify(statusMap)
                    });
                    socket.sendJson({
                        type: 'confirmation',
                        response: jsonUtils.messageToJson(message, chat)
                    });
                }
                done();
            });
        });
    }
    else { // old logic
        const messages = yield models_1.models.Message.findAll({
            limit: 1,
            where: {
                chatId: chat.id,
                sender: owner.id,
                type: [
                    constants.message_types.message,
                    constants.message_types.invoice,
                    constants.message_types.attachment,
                ],
                status: constants.statuses.pending,
            },
            order: [['createdAt', 'desc']]
        });
        const message = messages[0];
        message.update({ status: constants.statuses.received });
        socket.sendJson({
            type: 'confirmation',
            response: jsonUtils.messageToJson(message, chat)
        });
    }
});
exports.receiveConfirmation = receiveConfirmation;
const readMessages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const chat_id = req.params.chat_id;
    const owner = yield models_1.models.Contact.findOne({ where: { isOwner: true } });
    models_1.models.Message.update({ seen: true }, {
        where: {
            sender: {
                [sequelize_1.Op.ne]: owner.id
            },
            chatId: chat_id
        }
    });
    res_1.success(res, {});
});
exports.readMessages = readMessages;
const clearMessages = (req, res) => {
    models_1.models.Message.destroy({ where: {}, truncate: true });
    res_1.success(res, {});
};
exports.clearMessages = clearMessages;
//# sourceMappingURL=messages.js.map