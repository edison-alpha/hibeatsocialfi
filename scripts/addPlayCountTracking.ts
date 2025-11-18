/**
 * Script untuk menambahkan play count tracking ke semua file
 * 
 * MANUAL STEPS - Copy paste code ini ke setiap file:
 */

console.log(`
📝 MANUAL IMPLEMENTATION GUIDE
================================

Untuk setiap file yang listed, tambahkan code berikut:

1. ADD IMPORT (di bagian atas file):
   --------------------------------
   import { recordMusicPlay } from '@/utils/playCountHelper';
   import { useAccount } from 'wagmi'; // jika belum ada

2. GET ADDRESS (di dalam component):
   ----------------------------------
   const { address } = useAccount(); // jika belum ada

3. ADD TRACKING (di setiap playTrack call):
   ----------------------------------------
   // BEFORE:
   playTrack(track);
   
   // AFTER:
   playTrack(track);
   await recordMusicPlay(
     track.tokenId || track.id,
     address,
     parseDuration(track.duration),
     'SOURCE' // ganti dengan: feed, collection, playlist, explore, beats, post, detail
   );

4. HELPER FUNCTION (tambahkan di file jika belum ada):
   ---------------------------------------------------
   const parseDuration = (duration: string | number): number => {
     if (typeof duration === 'number') return duration;
     const parts = duration.split(':');
     if (parts.length === 2) {
       return parseInt(parts[0]) * 60 + parseInt(parts[1]);
     }
     return 180; // Default 3 minutes
   };

================================
FILES TO UPDATE:
================================

✅ DONE:
- [x] src/pages/DetailAlbum.tsx
- [x] src/components/feed/PostCard.tsx (3 lokasi)
- [x] src/pages/MyCollection.tsx

❌ TODO:
- [ ] src/pages/PostDetail.tsx (2 lokasi) - SOURCE: 'detail' dan 'post'
- [ ] src/pages/MyPlaylist.tsx (1 lokasi) - SOURCE: 'playlist'
- [ ] src/pages/Feed.tsx (1 lokasi) - SOURCE: 'feed'
- [ ] src/pages/Explore.tsx (3 lokasi) - SOURCE: 'explore'
- [ ] src/pages/Beats.tsx (2 lokasi) - SOURCE: 'beats'
- [ ] src/components/PlaylistModal.tsx (1 lokasi) - SOURCE: 'playlist'

================================
TESTING:
================================

Setelah semua diimplementasikan:
1. npm run dev
2. Play musik dari berbagai lokasi
3. Check console untuk "✅ [PlayCount] Play event recorded"
4. Buka DetailAlbum dan lihat play count bertambah
5. Verify best song badge muncul

================================
`);

process.exit(0);
