export async function GET() {
  const trendingMusic = [
    { id: "1", title: "Phonk Drift", artist: "GhostRider", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
    { id: "2", title: "LoFi Chill Beats", artist: "StudyGirl", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
    { id: "3", title: "Cyberpunk Synthwave", artist: "NeonCity", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
    { id: "4", title: "Cinematic Epic", artist: "Hans M.", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
    { id: "5", title: "Upbeat Corporate", artist: "PromoKing", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" }
  ];
  return Response.json({ success: true, data: trendingMusic });
}
