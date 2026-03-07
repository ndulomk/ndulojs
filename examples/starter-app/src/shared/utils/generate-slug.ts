export const generateSlug = (name: string): string => {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') 
    .replace(/[^\w\s-]/g, '') 
    .replace(/\s+/g, '-') 
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50); 
  const timestamp = Date.now().toString(36);
  
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${slug}-${timestamp}-${random}`.toLowerCase();
};