import { Controller, Post, Body, Get, UseGuards, Request, Delete, Query, Param, Patch } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard, RequirePermissions } from '../common/guards/permissions.guard';

@ApiTags('Exams & Question Bank')
@Controller('api/v1/exams')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@ApiBearerAuth()
export class ExamsController {
    constructor(private readonly examsService: ExamsService) { }

    @Get('question-bank')
    @RequirePermissions('exams:view')
    @ApiOperation({ summary: 'List questions' })
    async findAllQuestions(@Request() req, @Query() query: any) {
        return this.examsService.findAllQuestions(req.user.tenantId, query);
    }

    @Post('question-bank')
    @RequirePermissions('exams:create')
    @ApiOperation({ summary: 'Add a new question' })
    async createQuestion(@Request() req, @Body() data: any) {
        return this.examsService.createQuestion(req.user.tenantId, data);
    }

    @Patch('question-bank/:id/approve')
    @RequirePermissions('exams:approve')
    @ApiOperation({ summary: 'Approve a question' })
    async approveQuestion(@Request() req, @Param('id') id: string) {
        return this.examsService.approveQuestion(req.user.tenantId, id, req.user.userId);
    }

    @Get('blueprints')
    @RequirePermissions('exams:view')
    @ApiOperation({ summary: 'List all exam blueprints' })
    async findAllBlueprints(@Request() req) {
        return this.examsService.findAllBlueprints(req.user.tenantId);
    }

    @Post('blueprints')
    @RequirePermissions('exams:create')
    @ApiOperation({ summary: 'Create a new exam blueprint' })
    async createBlueprint(@Request() req, @Body() data: any) {
        return this.examsService.createBlueprint(req.user.tenantId, data);
    }

    @Post('generate')
    @RequirePermissions('exams:create')
    @ApiOperation({ summary: 'Generate versions of an exam from a blueprint' })
    async generateExam(@Request() req, @Body('blueprintId') blueprintId: string) {
        return this.examsService.generateExam(req.user.tenantId, blueprintId, req.user.userId);
    }

    @Patch('papers/:id/publish')
    @RequirePermissions('exams:publish')
    @ApiOperation({ summary: 'Publish exam paper' })
    async publishPaper(@Request() req, @Param('id') id: string) {
        return this.examsService.publishPaper(req.user.tenantId, id);
    }

    @Post('papers/:id/scores')
    @RequirePermissions('results:edit')
    @ApiOperation({ summary: 'Bulk submit student scores' })
    async submitScores(@Request() req, @Param('id') id: string, @Body('scores') scores: any[]) {
        return this.examsService.submitScores(req.user.tenantId, id, scores, req.user.userId);
    }
}
