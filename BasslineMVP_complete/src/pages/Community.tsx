import { useState } from "react";
import { Search, Heart, MessageCircle, Music, Star, UserPlus, Users, Play, Bookmark, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BottomNavigation } from "@/components/BottomNavigation";

const Community = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedPlaylist, setExpandedPlaylist] = useState<number | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    network: true,
    yourPosts: false,
    workoutFeed: false,
    friendsPlaylists: false,
    communityPlaylists: false
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Mock data for your own posts
  const yourPosts = [
    {
      id: 1,
      workoutType: "Morning HIIT",
      duration: "25 min",
      intensity: "High",
      caption: "Started the day strong! 💪",
      playlist: "Morning Energy Boost",
      likes: 12,
      timestamp: "1 hour ago"
    },
    {
      id: 2,
      workoutType: "Evening Yoga",
      duration: "45 min",
      intensity: "Low",
      caption: "Perfect way to unwind after a long day ✨",
      playlist: "Chill Flow Mix",
      likes: 8,
      timestamp: "3 days ago"
    }
  ];
  // Mock data for friends
  const friends = [
    {
      id: 1,
      username: "sarah_fit",
      avatar: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=400&fit=crop",
      workoutsThisWeek: 5,
      favoriteStyle: "HIIT"
    },
    {
      id: 2,
      username: "mike_runner",
      avatar: "https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=400&h=400&fit=crop",
      workoutsThisWeek: 3,
      favoriteStyle: "Cardio"
    },
    {
      id: 3,
      username: "yoga_emma",
      avatar: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=400&h=400&fit=crop",
      workoutsThisWeek: 7,
      favoriteStyle: "Yoga"
    },
    {
      id: 4,
      username: "strength_tom",
      avatar: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=400&fit=crop",
      workoutsThisWeek: 4,
      favoriteStyle: "Strength"
    }
  ];

  // Mock data for workout feed
  const workoutFeed = [
    {
      id: 1,
      user: {
        username: "sarah_fit",
        avatar: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=400&fit=crop"
      },
      workoutType: "HIIT Cardio",
      duration: "45 min",
      intensity: "High",
      caption: "Crushed this morning session! 🔥",
      playlist: "Beast Mode Mix",
      likes: 23,
      timestamp: "2 hours ago"
    },
    {
      id: 2,
      user: {
        username: "mike_runner",
        avatar: "https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=400&h=400&fit=crop"
      },
      workoutType: "5K Run",
      duration: "30 min",
      intensity: "Medium",
      caption: "Perfect weather for a run today",
      playlist: "Running Vibes",
      likes: 15,
      timestamp: "4 hours ago"
    },
    {
      id: 3,
      user: {
        username: "yoga_emma",
        avatar: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=400&h=400&fit=crop"
      },
      workoutType: "Vinyasa Flow",
      duration: "60 min",
      intensity: "Low",
      caption: "Finding my center ✨",
      playlist: "Calm & Flow",
      likes: 31,
      timestamp: "6 hours ago"
    }
  ];

  // Mock data for community playlists
  const communityPlaylists = [
    {
      id: 1,
      name: "90s Spin Fire",
      creator: "Coach Kev",
      isTrainer: true,
      tracks: 8,
      followers: 1.2,
      type: "Cycling",
      songs: [
        { title: "Power Drive", artist: "Energy Beats", duration: "3:42" },
        { title: "Rhythm Rush", artist: "Pulse Masters", duration: "4:15" },
        { title: "Beat Machine", artist: "Cardio Crew", duration: "3:58" },
        { title: "High Tempo Flow", artist: "Workout Warriors", duration: "4:32" },
        { title: "Electric Energy", artist: "Fitness Fire", duration: "3:27" },
        { title: "Dynamic Drive", artist: "Power Pulse", duration: "4:08" },
        { title: "Maximum Motion", artist: "Peak Performance", duration: "3:51" },
        { title: "Intense Impact", artist: "Training Tunes", duration: "4:24" }
      ]
    },
    {
      id: 2,
      name: "Chill Flow Mix",
      creator: "Pilates with Dee",
      isTrainer: true,
      tracks: 6,
      followers: 0.8,
      type: "Pilates",
      songs: [
        { title: "Gentle Waves", artist: "Calm Collective", duration: "4:45" },
        { title: "Peaceful Mind", artist: "Zen Masters", duration: "5:12" },
        { title: "Flowing Motion", artist: "Serenity Sounds", duration: "4:28" },
        { title: "Inner Balance", artist: "Mindful Music", duration: "5:03" },
        { title: "Soft Movements", artist: "Tranquil Tones", duration: "4:57" },
        { title: "Breath & Flow", artist: "Harmony Hub", duration: "4:38" }
      ]
    },
    {
      id: 3,
      name: "Beast Mode Hip-Hop",
      creator: "sarah_fit",
      isTrainer: false,
      tracks: 7,
      followers: 0.3,
      type: "HIIT",
      songs: [
        { title: "Unstoppable Force", artist: "Street Beats", duration: "3:35" },
        { title: "Power Moves", artist: "Urban Energy", duration: "3:48" },
        { title: "Grind Time", artist: "Hustle Hip-Hop", duration: "4:02" },
        { title: "Victory Lap", artist: "Champion Sounds", duration: "3:29" },
        { title: "Beast Unleashed", artist: "Raw Rhythms", duration: "3:55" },
        { title: "No Limits", artist: "Peak Power", duration: "4:18" },
        { title: "Strength Rising", artist: "Elite Energy", duration: "3:44" }
      ]
    },
    {
      id: 4,
      name: "Meditation & Stretch",
      creator: "Coach Marina",
      isTrainer: true,
      tracks: 5,
      followers: 2.1,
      type: "Recovery",
      songs: [
        { title: "Deep Relaxation", artist: "Spa Sounds", duration: "6:15" },
        { title: "Gentle Stretch", artist: "Recovery Rhythms", duration: "5:48" },
        { title: "Mindful Moments", artist: "Meditation Melodies", duration: "7:22" },
        { title: "Calm Restoration", artist: "Healing Harmonies", duration: "6:03" },
        { title: "Peaceful Recovery", artist: "Wellness Waves", duration: "5:37" }
      ]
    }
  ];

  // Mock data for friends playlists
  const friendsPlaylists = [
    {
      id: 5,
      name: "Morning Energy Boost",
      creator: "sarah_fit",
      isTrainer: false,
      tracks: 12,
      followers: 0.2,
      type: "Morning Workout",
      songs: [
        { title: "Rise & Shine", artist: "Energy Collective", duration: "3:28" },
        { title: "Morning Power", artist: "Wake Up Beats", duration: "4:01" },
        { title: "Start Strong", artist: "Dawn Fitness", duration: "3:45" },
        { title: "Early Bird Energy", artist: "Sunrise Sounds", duration: "3:52" },
        { title: "Fresh Start Flow", artist: "Morning Motivation", duration: "4:15" },
        { title: "Daybreak Drive", artist: "AM Athletics", duration: "3:33" },
        { title: "New Day Power", artist: "First Light Fitness", duration: "4:08" },
        { title: "Dawn Dynamics", artist: "Early Energy", duration: "3:41" },
        { title: "Sunrise Sprint", artist: "Morning Motion", duration: "3:56" },
        { title: "Wake Up Warrior", artist: "Dawn Drive", duration: "4:12" },
        { title: "Morning Momentum", artist: "Sunrise Strong", duration: "3:47" },
        { title: "Early Empowerment", artist: "Daybreak Beats", duration: "4:03" }
      ]
    },
    {
      id: 6,
      name: "Late Night Grind",
      creator: "mike_runner",
      isTrainer: false,
      tracks: 9,
      followers: 0.1,
      type: "Night Training",
      songs: [
        { title: "Midnight Power", artist: "Night Fitness", duration: "4:22" },
        { title: "After Hours Energy", artist: "Late Night Beats", duration: "3:54" },
        { title: "Moonlight Motion", artist: "Night Runners", duration: "4:16" },
        { title: "Dark Hour Drive", artist: "Midnight Movement", duration: "3:48" },
        { title: "Night Shift Strong", artist: "Evening Energy", duration: "4:05" },
        { title: "Twilight Training", artist: "Dusk Dynamics", duration: "3:59" },
        { title: "Shadow Sprint", artist: "Night Warriors", duration: "4:11" },
        { title: "Nocturnal Power", artist: "After Dark Athletics", duration: "3:52" },
        { title: "Evening Excellence", artist: "Night Power", duration: "4:07" }
      ]
    },
    {
      id: 7,
      name: "Weekend Warrior Mix",
      creator: "yoga_emma",
      isTrainer: false,
      tracks: 15,
      followers: 0.3,
      type: "Weekend Vibes",
      songs: [
        { title: "Saturday Strong", artist: "Weekend Warriors", duration: "3:38" },
        { title: "Sunday Sweat", artist: "Weekend Workout", duration: "4:14" },
        { title: "Weekend Energy", artist: "Saturday Sounds", duration: "3:52" },
        { title: "Rest Day Refresh", artist: "Sunday Fitness", duration: "4:06" },
        { title: "Weekend Vibes", artist: "Saturday Sprint", duration: "3:45" },
        { title: "Leisure Power", artist: "Weekend Wonder", duration: "4:18" },
        { title: "Saturday Sessions", artist: "Weekend Beats", duration: "3:41" },
        { title: "Sunday Strong", artist: "Weekend Power", duration: "4:09" },
        { title: "Weekend Warrior", artist: "Saturday Strong", duration: "3:57" },
        { title: "Free Time Fitness", artist: "Weekend Energy", duration: "4:02" },
        { title: "Saturday Sweat", artist: "Weekend Workout", duration: "3:49" },
        { title: "Sunday Sessions", artist: "Weekend Motion", duration: "4:13" },
        { title: "Weekend Wonder", artist: "Saturday Power", duration: "3:56" },
        { title: "Leisure Training", artist: "Weekend Vibes", duration: "4:05" },
        { title: "Weekend Finish", artist: "Sunday Strong", duration: "3:44" }
      ]
    }
  ];

  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case "High":
        return "bg-burgundy-dark text-cream";
      case "Medium":
        return "bg-burgundy text-cream";
      case "Low":
        return "bg-cream text-burgundy-dark";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-premium-texture text-cream pb-20">
      {/* Header */}
      <div className="px-6 py-8 bg-gradient-primary">
        <h1 className="text-3xl font-bold text-cream mb-6">Community</h1>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cream/60 w-5 h-5" />
          <Input
            placeholder="Find friends or search members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/10 border-cream/20 text-cream placeholder:text-cream/60"
          />
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="px-6 space-y-8">
          {/* Friends Network Section */}
          <section className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => toggleSection('network')}
                className="flex items-center gap-2 text-xl font-semibold text-cream hover:text-cream/80 transition-colors"
              >
                <Users className="w-5 h-5" />
                Your Network
                {expandedSections.network ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </button>
              <Button variant="outline" size="sm">
                <UserPlus className="w-4 h-4 mr-2" />
                Find Friends
              </Button>
            </div>
            
            {expandedSections.network && (
              <div className="grid grid-cols-2 gap-4">
                {friends.map((friend) => (
                  <Card key={friend.id} className="bg-burgundy-dark/30 border-cream/20">
                    <CardContent className="p-4 text-center">
                      <Avatar className="mx-auto mb-3 w-16 h-16">
                        <AvatarImage src={friend.avatar} alt={friend.username} />
                        <AvatarFallback>{friend.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <h3 className="font-medium text-cream mb-2">@{friend.username}</h3>
                      <div className="space-y-1 text-sm text-cream/70">
                        <div>{friend.workoutsThisWeek} workouts this week</div>
                        <Badge variant="secondary" className="text-xs">
                          {friend.favoriteStyle}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Your Posts Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => toggleSection('yourPosts')}
                className="flex items-center gap-2 text-xl font-semibold text-cream hover:text-cream/80 transition-colors"
              >
                <Star className="w-5 h-5" />
                Your Posts
                {expandedSections.yourPosts ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </button>
            </div>
            
            {expandedSections.yourPosts && (
              <div className="space-y-4 mb-8">
                {yourPosts.map((post) => (
                  <Card key={post.id} className="bg-burgundy-dark/20 border-cream/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=400&fit=crop" alt="You" />
                            <AvatarFallback>YOU</AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-medium text-cream">You</h3>
                            <p className="text-sm text-cream/60">{post.timestamp}</p>
                          </div>
                        </div>
                        <Badge className={getIntensityColor(post.intensity)}>
                          {post.intensity}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <div className="flex items-center gap-4 text-sm text-cream/80">
                          <span className="font-medium">{post.workoutType}</span>
                          <span>•</span>
                          <span>{post.duration}</span>
                        </div>
                        
                        {post.caption && (
                          <p className="text-cream">{post.caption}</p>
                        )}
                        
                        {post.playlist && (
                          <div className="flex items-center gap-2 p-3 bg-burgundy-dark/30 rounded-lg">
                            <Music className="w-4 h-4 text-green-400" />
                            <span className="text-sm text-cream/90">🎵 {post.playlist}</span>
                            <Play className="w-4 h-4 ml-auto text-cream/60" />
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between pt-2">
                          <Button variant="ghost" size="sm" className="text-cream/70 hover:text-cream">
                            <Heart className="w-4 h-4 mr-2" />
                            {post.likes} Cheers
                          </Button>
                          <Button variant="ghost" size="sm" className="text-cream/70 hover:text-cream">
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Comment
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Workout Feed Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => toggleSection('workoutFeed')}
                className="flex items-center gap-2 text-xl font-semibold text-cream hover:text-cream/80 transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                Workout Feed
                {expandedSections.workoutFeed ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </button>
            </div>
            
            {expandedSections.workoutFeed && (
              <div className="space-y-4 mb-8">
                {workoutFeed.map((post) => (
                  <Card key={post.id} className="bg-burgundy-dark/20 border-cream/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={post.user.avatar} alt={post.user.username} />
                            <AvatarFallback>{post.user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-medium text-cream">@{post.user.username}</h3>
                            <p className="text-sm text-cream/60">{post.timestamp}</p>
                          </div>
                        </div>
                        <Badge className={getIntensityColor(post.intensity)}>
                          {post.intensity}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <div className="flex items-center gap-4 text-sm text-cream/80">
                          <span className="font-medium">{post.workoutType}</span>
                          <span>•</span>
                          <span>{post.duration}</span>
                        </div>
                        
                        {post.caption && (
                          <p className="text-cream">{post.caption}</p>
                        )}
                        
                        {post.playlist && (
                          <div className="flex items-center gap-2 p-3 bg-burgundy-dark/30 rounded-lg">
                            <Music className="w-4 h-4 text-green-400" />
                            <span className="text-sm text-cream/90">🎵 {post.playlist}</span>
                            <Play className="w-4 h-4 ml-auto text-cream/60" />
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between pt-2">
                          <Button variant="ghost" size="sm" className="text-cream/70 hover:text-cream">
                            <Heart className="w-4 h-4 mr-2" />
                            {post.likes} Cheers
                          </Button>
                          <Button variant="ghost" size="sm" className="text-cream/70 hover:text-cream">
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Comment
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Friends Playlists Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => toggleSection('friendsPlaylists')}
                className="flex items-center gap-2 text-xl font-semibold text-cream hover:text-cream/80 transition-colors"
              >
                <Users className="w-5 h-5" />
                Friends Playlists
                {expandedSections.friendsPlaylists ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </button>
            </div>
            
            {expandedSections.friendsPlaylists && (
              <div className="space-y-3 mb-8">
                {friendsPlaylists.map((playlist) => (
                  <Card key={playlist.id} className="bg-burgundy-dark/20 border-cream/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
                            <Music className="w-6 h-6 text-cream" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-cream">{playlist.name}</h3>
                              <Badge className="bg-cream/20 text-cream">
                                Friend
                              </Badge>
                            </div>
                            <p className="text-sm text-cream/70">by {playlist.creator}</p>
                            <div className="flex items-center gap-3 text-xs text-cream/60 mt-1">
                              <span>{playlist.tracks} tracks</span>
                              <span>•</span>
                              <span>{playlist.followers}k followers</span>
                              <span>•</span>
                              <span>{playlist.type}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Play className="w-4 h-4 mr-2" />
                            Create playlist in Spotify
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Bookmark className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              console.log('Clicking playlist', playlist.id, 'current expanded:', expandedPlaylist);
                              setExpandedPlaylist(
                                expandedPlaylist === playlist.id ? null : playlist.id
                              );
                            }}
                            className="border-cream/40 text-cream hover:bg-cream/10"
                          >
                            {expandedPlaylist === playlist.id ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      {expandedPlaylist === playlist.id && (
                        <div className="mt-4 pt-4 border-t border-cream/20">
                          <h4 className="text-sm font-medium text-cream/90 mb-3">Track List</h4>
                          <div className="space-y-2">
                            {playlist.songs.map((song, index) => (
                              <div key={index} className="flex items-center justify-between py-2 px-3 bg-burgundy-dark/30 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-cream/60 w-6">{index + 1}</span>
                                  <div>
                                    <p className="text-sm font-medium text-cream">{song.title}</p>
                                    <p className="text-xs text-cream/70">{song.artist}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-cream/60 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {song.duration}
                                  </span>
                                  <Button variant="ghost" size="sm" className="p-1">
                                    <Play className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Community Playlists Section */}
          <section className="pb-8">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => toggleSection('communityPlaylists')}
                className="flex items-center gap-2 text-xl font-semibold text-cream hover:text-cream/80 transition-colors"
              >
                <Music className="w-5 h-5" />
                Community Playlists
                {expandedSections.communityPlaylists ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </button>
            </div>
            
            {expandedSections.communityPlaylists && (
              <div className="space-y-3">
                {communityPlaylists.map((playlist) => (
                  <Card key={playlist.id} className="bg-burgundy-dark/20 border-cream/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
                            <Music className="w-6 h-6 text-cream" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-cream">{playlist.name}</h3>
                              {playlist.isTrainer && (
                                <Badge className="bg-burgundy text-cream">
                                  <Star className="w-3 h-3 mr-1" />
                                  Trainer
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-cream/70">by {playlist.creator}</p>
                            <div className="flex items-center gap-3 text-xs text-cream/60 mt-1">
                              <span>{playlist.tracks} tracks</span>
                              <span>•</span>
                              <span>{playlist.followers}k followers</span>
                              <span>•</span>
                              <span>{playlist.type}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Play className="w-4 h-4 mr-2" />
                            Create playlist in Spotify
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Bookmark className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              console.log('Clicking playlist', playlist.id, 'current expanded:', expandedPlaylist);
                              setExpandedPlaylist(
                                expandedPlaylist === playlist.id ? null : playlist.id
                              );
                            }}
                            className="border-cream/40 text-cream hover:bg-cream/10"
                          >
                            {expandedPlaylist === playlist.id ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      {expandedPlaylist === playlist.id && (
                        <div className="mt-4 pt-4 border-t border-cream/20">
                          <h4 className="text-sm font-medium text-cream/90 mb-3">Track List</h4>
                          <div className="space-y-2">
                            {playlist.songs.map((song, index) => (
                              <div key={index} className="flex items-center justify-between py-2 px-3 bg-burgundy-dark/30 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-cream/60 w-6">{index + 1}</span>
                                  <div>
                                    <p className="text-sm font-medium text-cream">{song.title}</p>
                                    <p className="text-xs text-cream/70">{song.artist}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-cream/60 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {song.duration}
                                  </span>
                                  <Button variant="ghost" size="sm" className="p-1">
                                    <Play className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      </ScrollArea>

      <BottomNavigation />
    </div>
  );
};

export default Community;