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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/availability', auth_1.authenticateToken, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const authenticatedReq = req;
    const { userId } = authenticatedReq.user;
    const { week } = req.query;
    try {
        const result = yield database_1.pool.query('SELECT * FROM availability WHERE user_id = $1 AND week = $2', [userId, week]);
        res.json(((_a = result.rows[0]) === null || _a === void 0 ? void 0 : _a.availability) || {});
    }
    catch (error) {
        console.error('Fetch availability error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}));
router.post('/availability', auth_1.authenticateToken, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const authenticatedReq = req;
    const { userId } = authenticatedReq.user;
    const { availability, week } = req.body;
    try {
        yield database_1.pool.query('INSERT INTO availability (user_id, week, availability) VALUES ($1, $2, $3) ON CONFLICT (user_id, week) DO UPDATE SET availability = $3', [userId, week, availability]);
        res.json({ message: 'Availability saved successfully' });
    }
    catch (error) {
        console.error('Save availability error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}));
exports.default = router;
