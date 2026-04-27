import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { apiKeyAuth } from '../middleware/apiKeyAuth';
import { getData, getDataByDevice, postData } from '../controllers/dataController';

export const dataRoutes = Router();

dataRoutes.post('/data', apiKeyAuth, asyncHandler(postData));

dataRoutes.get('/data', apiKeyAuth, asyncHandler(getData));
dataRoutes.get('/data/:deviceId', apiKeyAuth, asyncHandler(getDataByDevice));
