INSERT INTO storage.buckets (id, name, public) VALUES ('avatars',   'avatars', true);

  CREATE POLICY "Public avatars read" ON storage.objects FOR SELECT   USING (bucket_id = 'avatars');
  CREATE POLICY "Auth users upload avatars" ON storage.objects FOR 
  INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text =  
  (storage.foldername(name))[1]);
  CREATE POLICY "Auth users update own avatar" ON storage.objects  
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text =   
  (storage.foldername(name))[1]);