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
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const database_1 = require("./database");
passport_1.default.use(new passport_google_oauth20_1.Strategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:5003/api/auth/google/callback"
}, (accessToken, refreshToken, profile, done) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Check if user already exists
        const result = yield database_1.pool.query('SELECT * FROM users WHERE google_id = $1', [profile.id]);
        if (result.rows.length > 0) {
            // User exists, return user
            return done(null, result.rows[0]);
        }
        else {
            // Create new user
            const newUser = yield database_1.pool.query('INSERT INTO users (google_id, email, username, role) VALUES ($1, $2, $3, $4) RETURNING *', [profile.id, (_a = profile.emails) === null || _a === void 0 ? void 0 : _a[0].value, profile.displayName, 'employee']);
            return done(null, newUser.rows[0]);
        }
    }
    catch (error) {
        return done(error);
    }
})));
passport_1.default.serializeUser((user, done) => {
    done(null, user.id);
});
passport_1.default.deserializeUser((id, done) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield database_1.pool.query('SELECT * FROM users WHERE id = $1', [id]);
        done(null, result.rows[0]);
    }
    catch (error) {
        done(error);
    }
}));
exports.default = passport_1.default;
