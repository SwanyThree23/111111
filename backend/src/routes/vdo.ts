import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { vdoNinjaService } from '../services/vdo-ninja';
import { logger } from '../config/logger';

const router = Router();

router.use(authenticateToken);

// POST /api/vdo/rooms
router.post('/rooms', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { streamId } = req.body;
    if (!streamId) {
      res.status(400).json({ error: 'streamId is required' });
      return;
    }
    const room = await vdoNinjaService.createRoom(streamId);
    res.status(201).json({ room });
  } catch (err: any) {
    logger.error('Create VDO room error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// GET /api/vdo/rooms/:roomId
router.get('/rooms/:roomId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const room = await vdoNinjaService.getRoom(req.params.roomId);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    res.json({ room });
  } catch (err) {
    logger.error('Get VDO room error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/vdo/rooms/stream/:streamId
router.get('/rooms/stream/:streamId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const room = await vdoNinjaService.getRoomByStreamId(req.params.streamId);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    res.json({ room });
  } catch (err) {
    logger.error('Get VDO room by stream error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/vdo/rooms/:roomId/participants
router.post('/rooms/:roomId/participants', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, role } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }
    const participant = await vdoNinjaService.addParticipant(req.params.roomId, name, role);
    res.status(201).json({ participant });
  } catch (err: any) {
    logger.error('Add VDO participant error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// DELETE /api/vdo/participants/:participantId
router.delete('/participants/:participantId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const participant = await vdoNinjaService.removeParticipant(req.params.participantId);
    res.json({ participant });
  } catch (err) {
    logger.error('Remove VDO participant error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/vdo/rooms/:roomId/stats
router.get('/rooms/:roomId/stats', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stats = await vdoNinjaService.getRoomStats(req.params.roomId);
    res.json({ stats });
  } catch (err: any) {
    logger.error('Get VDO room stats error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// POST /api/vdo/rooms/:roomId/invite
router.post('/rooms/:roomId/invite', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const room = await vdoNinjaService.getRoom(req.params.roomId);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    const { role = 'guest' } = req.body;
    const inviteLink = vdoNinjaService.generateInviteLink(room.roomName, room.password, role as 'director' | 'guest');
    res.json({ inviteLink, role });
  } catch (err) {
    logger.error('Generate VDO invite error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
