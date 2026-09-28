import { createOpenAPIApp } from '@resetshop/hono-core'
import cardController from './card/card.controller'

const app = createOpenAPIApp()

// Card CRUD endpoints: /cards, /cards/:id
app.route('/cards', cardController)

export default app
