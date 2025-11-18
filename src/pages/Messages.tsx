import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Mail,
  Search,
  Send,
  MoreHorizontal,
  Music,
  Image,
  Paperclip,
  Smile,
  Phone,
  Video,
  Headphones
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import NotificationDropdown from "@/components/NotificationDropdown";
import Navbar from "@/components/Navbar";
import hibeatsLogo from "@/assets/hibeats.png";

const Messages = () => {
  const [selectedConversation, setSelectedConversation] = useState<number | null>(1);
  const [messageText, setMessageText] = useState("");

  const conversations = [
    {
      id: 1,
      user: "Jazz Fusion",
      avatar: "JF",
      lastMessage: "Hey, loved your latest track! 🔥",
      time: "2m ago",
      unread: true,
      online: true
    },
    {
      id: 2,
      user: "Beat Masters",
      avatar: "BM",
      lastMessage: "Thanks for the collaboration offer",
      time: "1h ago",
      unread: false,
      online: true
    },
    {
      id: 3,
      user: "Synthwave Collective",
      avatar: "SC",
      lastMessage: "When's the next release?",
      time: "3h ago",
      unread: true,
      online: false
    },
    {
      id: 4,
      user: "Ambient Sounds",
      avatar: "AS",
      lastMessage: "Check out this new remix",
      time: "1d ago",
      unread: false,
      online: false
    },
    {
      id: 5,
      user: "Urban Beats",
      avatar: "UB",
      lastMessage: "Great show last night!",
      time: "2d ago",
      unread: false,
      online: true
    }
  ];

  const messages = [
    {
      id: 1,
      sender: "Jazz Fusion",
      content: "Hey! I just listened to your latest track 'Midnight Groove'",
      time: "10:30 AM",
      isMe: false
    },
    {
      id: 2,
      sender: "You",
      content: "Thanks! Glad you liked it 😊",
      time: "10:32 AM",
      isMe: true
    },
    {
      id: 3,
      sender: "Jazz Fusion",
      content: "The jazz fusion elements are incredible. Have you thought about collaborating with other artists?",
      time: "10:35 AM",
      isMe: false
    },
    {
      id: 4,
      sender: "You",
      content: "Definitely! I'm always open to collaborations. What kind of style are you thinking?",
      time: "10:37 AM",
      isMe: true
    },
    {
      id: 5,
      sender: "Jazz Fusion",
      content: "Maybe something with electronic beats mixed with live instrumentation. I have some ideas for a track called 'Digital Dreams'",
      time: "10:40 AM",
      isMe: false
    },
    {
      id: 6,
      sender: "Jazz Fusion",
      content: "Would love to hear your thoughts on this 🔥",
      time: "10:41 AM",
      isMe: false
    }
  ];

  const sendMessage = () => {
    if (messageText.trim()) {
      console.log("Sending message:", messageText);
      setMessageText("");
    }
  };

  const selectedUser = conversations.find(conv => conv.id === selectedConversation);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Main Content */}
      <main className="pt-16">
        <div className="container mx-auto px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
            {/* Conversations Sidebar */}
            <div className="lg:col-span-1">
              <Card className="h-full border-border/50">
                <CardContent className="p-0">
                  {/* Search */}
                  <div className="p-4 border-b border-border/20">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Search messages..."
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Conversations List */}
                  <ScrollArea className="h-full">
                    <div className="divide-y divide-border/20">
                      {conversations.map((conversation) => (
                        <div
                          key={conversation.id}
                          onClick={() => setSelectedConversation(conversation.id)}
                          className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                            selectedConversation === conversation.id ? 'bg-primary/10 border-r-2 border-primary' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar className="w-10 h-10">
                                <AvatarImage src="" />
                                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                                  {conversation.avatar}
                                </AvatarFallback>
                              </Avatar>
                              {conversation.online && (
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="font-semibold text-sm truncate">
                                  {conversation.user}
                                </h3>
                                <span className="text-xs text-muted-foreground">
                                  {conversation.time}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {conversation.lastMessage}
                              </p>
                            </div>

                            {conversation.unread && (
                              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Chat Area */}
            <div className="lg:col-span-2">
              {selectedConversation ? (
                <Card className="h-full border-border/50 flex flex-col">
                  {/* Chat Header */}
                  <div className="p-4 border-b border-border/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src="" />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {selectedUser?.avatar}
                          </AvatarFallback>
                        </Avatar>
                        {selectedUser?.online && (
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></div>
                        )}
                      </div>
                      <div>
                        <h2 className="font-semibold">{selectedUser?.user}</h2>
                        <p className="text-xs text-muted-foreground">
                          {selectedUser?.online ? 'Active now' : 'Offline'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                        <Phone className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                        <Video className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              message.isMe
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p className={`text-xs mt-1 ${
                              message.isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
                            }`}>
                              {message.time}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Message Input */}
                  <div className="p-4 border-t border-border/20">
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Textarea
                          placeholder="Type a message..."
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          className="min-h-[60px] resize-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendMessage();
                            }
                          }}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                          <Image className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                          <Paperclip className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                          <Smile className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={sendMessage}
                          disabled={!messageText.trim()}
                          size="sm"
                          className="w-8 h-8 p-0"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="h-full border-border/50 flex items-center justify-center">
                  <CardContent className="text-center">
                    <Mail className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-2">Select a conversation</h3>
                    <p className="text-muted-foreground">
                      Choose a conversation from the sidebar to start messaging.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Messages;