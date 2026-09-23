import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import multer from 'multer';
import { join } from 'path';
import { readFileSync, renameSync, unlinkSync } from 'fs';
import { fileTypeFromBuffer } from 'file-type';
import { EventsService } from './events.service.js';
import { CreateEventDto } from './dto/create-event.dto.js';
import { UpdateEventDto } from './dto/update-event.dto.js';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto.js';
import { JwtGuard } from '../auth/guards/jwt.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

/**
 * Extensão salva no disco vem SEMPRE deste mapa (derivado dos magic bytes
 * reais), nunca do nome de arquivo enviado pelo cliente. Do contrário, um
 * arquivo polyglot (ex.: assinatura de GIF válida + payload HTML/JS, salvo
 * com nome "x.html") seria servido por /uploads com Content-Type text/html,
 * abrindo XSS armazenado no domínio da API.
 */
const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

// Grava com extensão neutra e não-executável até o conteúdo ser validado.
const uploadStorage = multer.diskStorage({
  destination: join(process.cwd(), 'uploads'),
  filename: (_req, _file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}.upload`);
  },
});

/**
 * Confere os magic bytes do arquivo enviado e o renomeia para a extensão real
 * do conteúdo. Apaga o arquivo e lança 400 se o tipo não for o esperado.
 */
async function finalizeUpload(
  file: Express.Multer.File | undefined,
  allowed: Set<string>,
  invalidMessage: string,
): Promise<string> {
  if (!file) throw new BadRequestException('Nenhum arquivo enviado');

  const detected = await fileTypeFromBuffer(readFileSync(file.path));
  if (!detected || !allowed.has(detected.mime)) {
    unlinkSync(file.path);
    throw new BadRequestException(invalidMessage);
  }

  const finalFilename = file.filename.replace(/\.upload$/, EXTENSION_BY_MIME[detected.mime]);
  renameSync(file.path, join(file.destination, finalFilename));
  return finalFilename;
}

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @UseGuards(JwtGuard)
  @Get()
  findAll(@CurrentUser() user: { id: string }) {
    return this.eventsService.findAll(user.id);
  }

  @UseGuards(JwtGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.eventsService.findOne(id, user.id);
  }

  @UseGuards(JwtGuard)
  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateEventDto,
  ) {
    return this.eventsService.create(user.id, dto);
  }

  @UseGuards(JwtGuard)
  @Put(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.update(id, user.id, dto);
  }

  @UseGuards(JwtGuard)
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.eventsService.remove(id, user.id);
  }

  @UseGuards(JwtGuard)
  @Get(':id/payment-methods')
  getPaymentMethods(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.eventsService.getPaymentMethods(id, user.id);
  }

  /** Taxa de serviço vigente para este evento (percentual, fixo e piso). */
  @UseGuards(JwtGuard)
  @Get(':id/fee-config')
  getFeeConfig(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.eventsService.getFeeConfig(id, user.id);
  }

  @UseGuards(JwtGuard)
  @Post(':id/payment-methods')
  addPaymentMethod(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreatePaymentMethodDto,
  ) {
    return this.eventsService.addPaymentMethod(id, user.id, dto);
  }

  @UseGuards(JwtGuard)
  @Post(':id/banner')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: uploadStorage,
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/image\/(jpg|jpeg|png|gif|webp)/)) {
          return cb(new BadRequestException('Apenas imagens são permitidas'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadBanner(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    const filename = await finalizeUpload(file, ALLOWED_IMAGE_TYPES, 'Arquivo não é uma imagem válida');
    return this.eventsService.uploadBanner(id, user.id, filename);
  }

  /** Modelo de autorização de responsável (PDF) que o participante baixa na inscrição. */
  @UseGuards(JwtGuard)
  @Post(':id/authorization-form')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: uploadStorage,
      fileFilter: (_req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          return cb(new BadRequestException('Apenas arquivos PDF são permitidos'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadAuthorizationForm(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    const filename = await finalizeUpload(file, new Set(['application/pdf']), 'Arquivo não é um PDF válido');
    return this.eventsService.uploadAuthorizationForm(id, user.id, filename);
  }

  @UseGuards(JwtGuard)
  @Delete(':id/authorization-form')
  removeAuthorizationForm(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.eventsService.removeAuthorizationForm(id, user.id);
  }

  @UseGuards(JwtGuard)
  @Delete(':id/payment-methods/:methodId')
  removePaymentMethod(
    @Param('id') id: string,
    @Param('methodId') methodId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.eventsService.removePaymentMethod(id, methodId, user.id);
  }
}
