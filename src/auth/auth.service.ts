import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthDto } from './dto';
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async signin(dto: AuthDto) {
    // find user by email
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    // if not found, throw an error
    if (!user) {
      throw new ForbiddenException('Invalid credentials');
    }

    // verify the password
    const validPassword = await argon.verify(user.password, dto.password);

    // if not valid, throw an error
    if (!validPassword) {
      throw new ForbiddenException('Invalid credentials');
    }

    // send back the user
    delete user.password;
    return user;
  }

  async signup(dto: AuthDto) {
    // generate the password hash (argon2)
    const passwordHash = await argon.hash(dto.password);

    try {
      // save the user in the database
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: passwordHash,
        },
      });

      delete user.password;

      // return the user
      return user;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ForbiddenException('User already exists');
        }
      }

      throw error;
    }
  }
}
