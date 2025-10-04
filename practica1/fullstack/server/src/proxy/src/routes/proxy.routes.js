import { Router } from 'express'
import {
  types,
  byType,
  bySku,
  search,
  addCart,
  cart,
  checkout
} from '../controllers/proxy.controllers.js'

const router = Router()

router.get('/types', types)

router.get('/by-type/:type', byType)

router.get('/item/:sku', bySku)

router.get('/search', search)

router.post('/cart/add', addCart)

router.get('/cart', cart)

router.post('/checkout', checkout)

export default router
