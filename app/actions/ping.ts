'use server'

export async function pingServer() {
  return { success: true, message: 'Server action works!' }
}
