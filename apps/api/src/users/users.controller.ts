import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserAuthGuard } from '../common/guards/user-auth.guard';
import { UserId } from '../common/decorators';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(UserAuthGuard)
@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ==================== PROFILE ====================

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@UserId() userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Post('profile')
  @ApiOperation({ summary: 'Update user name' })
  async updateProfile(
    @UserId() userId: string,
    @Body() body: { name: string },
  ) {
    return this.usersService.updateProfile(userId, body.name);
  }

  @Delete('profile')
  @ApiOperation({
    summary: 'Delete the current account',
    description:
      'Anonymizes the account and revokes all its sessions. Orders are kept for accounting. ' +
      '409 while the account has orders in progress (CONFIRMED, PREPARING, DELIVERED).',
  })
  async deleteProfile(@UserId() userId: string) {
    return this.usersService.deleteAccount(userId);
  }

  // ==================== ADDRESSES ====================

  @Get('addresses')
  @ApiOperation({ summary: 'List user addresses' })
  async getAddresses(@UserId() userId: string) {
    return this.usersService.getAddresses(userId);
  }

  @Post('addresses')
  @ApiOperation({ summary: 'Create a new address (max 5)' })
  async createAddress(
    @UserId() userId: string,
    @Body()
    body: {
      title: string;
      full_address: string;
      city: string;
      district?: string;
      street?: string;
      building?: string;
      apartment?: string;
      entrance?: string;
      floor?: string;
      latitude?: number;
      longitude?: number;
      is_default?: boolean;
    },
  ) {
    return this.usersService.createAddress(userId, body);
  }

  @Delete('addresses/:addressId')
  @ApiOperation({ summary: 'Delete an address' })
  async deleteAddress(
    @UserId() userId: string,
    @Param('addressId') addressId: string,
  ) {
    return this.usersService.deleteAddress(userId, addressId);
  }

  @Post('addresses/:addressId/default')
  @ApiOperation({ summary: 'Set an address as default' })
  async setDefaultAddress(
    @UserId() userId: string,
    @Param('addressId') addressId: string,
  ) {
    return this.usersService.setDefaultAddress(userId, addressId);
  }

  // ==================== FAVORITES ====================

  @Get('favorites')
  @ApiOperation({ summary: 'List favorite products' })
  async getFavorites(@UserId() userId: string) {
    return this.usersService.getFavorites(userId);
  }

  @Post('favorites')
  @ApiOperation({ summary: 'Add a product to favorites' })
  async addFavorite(
    @UserId() userId: string,
    @Body() body: { product_id: string },
  ) {
    return this.usersService.addFavorite(userId, body.product_id);
  }

  @Delete('favorites/:productId')
  @ApiOperation({ summary: 'Remove a product from favorites' })
  async removeFavorite(
    @UserId() userId: string,
    @Param('productId') productId: string,
  ) {
    return this.usersService.removeFavorite(userId, productId);
  }
}
