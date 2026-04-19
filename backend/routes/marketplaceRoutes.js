import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  purchaseItem,
  getOrders,
} from '../controllers/marketplaceController.js';

const router = express.Router();

// Public — course catalog listing
router.get('/items',    getItems);
router.get('/item/:id', getItemById);

// Protected
router.use(protect);
router.post('/item',         createItem);
router.put('/item/:id',      updateItem);
router.delete('/item/:id',   deleteItem);
router.post('/purchase',     purchaseItem);
router.get('/orders/:userId', getOrders);

export default router;
