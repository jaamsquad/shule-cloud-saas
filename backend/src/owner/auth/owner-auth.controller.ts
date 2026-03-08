import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { OwnerAuthService } from './owner-auth.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Owner - Authentication')
@Controller('api/v1/owner/auth')
export class OwnerAuthController {
    constructor(private readonly authService: OwnerAuthService) { }

    @Post('register')
    @ApiOperation({ summary: 'Register the first platform admin (development only)' })
    async register(@Body() dto: any) {
        return this.authService.register(dto);
    }

    @Post('login')
    @ApiOperation({ summary: 'Login to owner portal' })
    async login(@Body() dto: any) {
        return this.authService.login(dto);
    }

    @Get('me')
    @UseGuards(AuthGuard('owner-jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current owner admin profile' })
    async getMe(@Request() req: any) {
        return this.authService.getMe(req.user.sub);
    }

    @Post('password')
    @UseGuards(AuthGuard('owner-jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Change owner password' })
    async changePassword(@Request() req: any, @Body() dto: any) {
        return this.authService.changePassword(req.user.sub, dto);
    }
}
