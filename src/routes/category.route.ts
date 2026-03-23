import { Router } from 'express';
import { readCategories } from '../controllers/category.controller';

const router = Router();

router.get('/', readCategories);

export default router;
