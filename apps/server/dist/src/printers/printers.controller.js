"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrintersController = void 0;
const common_1 = require("@nestjs/common");
const printers_service_1 = require("./printers.service");
let PrintersController = class PrintersController {
    printersService;
    constructor(printersService) {
        this.printersService = printersService;
    }
    findAll() {
        return this.printersService.findAll();
    }
};
exports.PrintersController = PrintersController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PrintersController.prototype, "findAll", null);
exports.PrintersController = PrintersController = __decorate([
    (0, common_1.Controller)('printers'),
    __metadata("design:paramtypes", [printers_service_1.PrintersService])
], PrintersController);
//# sourceMappingURL=printers.controller.js.map