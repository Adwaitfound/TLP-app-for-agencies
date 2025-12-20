'use server'

export async function testAction() {
  console.log('[SERVER] Test action called')
  return { success: true, message: 'Test action works!' }
}
