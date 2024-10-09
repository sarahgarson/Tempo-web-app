"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const passport_1 = __importDefault(require("./config/passport"));
const auth_1 = __importDefault(require("./routes/auth"));
const schedules_1 = __importDefault(require("./routes/schedules"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 5003;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(passport_1.default.initialize());
app.use('/api/auth', auth_1.default, passport_1.default.authenticate('jwt', { session: false }));
app.use('/api/schedules', schedules_1.default);
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
