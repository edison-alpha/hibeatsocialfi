import { useState, useRef, useMemo, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, AtSign, AlertCircle } from "lucide-react";
import { useSomniaDatastream } from "@/contexts/SomniaDatastreamContext";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useAccount } from "wagmi";
import { useLiveIndicators } from "@/hooks/useLiveIndicators";

interface CommentInputProps {
  onSubmit: (comment: string) => void;
  isSubmitting?: boolean;
  disabled?: boolean;
  placeholder?: string;
  avatarUrl?: string;
  displayName?: string;
  autoFocus?: boolean;
  postAuthor?: string; // For sending comment notification
  postId?: string; // For sending comment notification
}

const CommentInput = ({
  onSubmit,
  isSubmitting = false,
  disabled = false,
  placeholder = "Write a comment...",
  avatarUrl,
  displayName = "User",
  autoFocus = false,
  postAuthor,
  postId
}: CommentInputProps) => {
  const { readAllUserProfiles, isConnected, recentEvents } = useSomniaDatastream();
  const { address } = useAccount();
  
  // ⌨️ Live typing indicator
  const { updateTyping } = useLiveIndicators(postId || '');
  
  const [commentText, setCommentText] = useState("");
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionPosition, setMentionPosition] = useState(0);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch users from Subgraph + DataStream
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        console.log('🔍 [COMMENT] Fetching users from Subgraph + DataStream...');
        
        // Fetch from Subgraph
        let subgraphUsers: any[] = [];
        try {
          const { apolloClient } = await import('@/lib/apollo-client');
          const { GET_ALL_USERS } = await import('@/graphql/queries');

          console.log('📡 [COMMENT] Querying Subgraph...');
          const result = await apolloClient.query({
            query: GET_ALL_USERS,
            variables: {
              first: 50, // Limit for comment (smaller than post composer)
              skip: 0,
              orderBy: 'createdAt',
              orderDirection: 'desc'
            },
            fetchPolicy: 'network-only' // Always fetch fresh data
          });

          console.log('📡 [COMMENT] Subgraph result:', result);

          if ((result.data as any)?.userProfiles && (result.data as any).userProfiles.length > 0) {
            subgraphUsers = (result.data as any).userProfiles
              .filter((p: any) => p.username)
              .map((p: any) => ({
                username: p.username,
                displayName: p.displayName || p.username,
                avatar: p.avatarHash || '',
                isArtist: p.isArtist || false,
                isVerified: p.isVerified || false,
                userAddress: p.id
              }));
            
            console.log(`✅ [COMMENT] Loaded ${subgraphUsers.length} users from Subgraph`);
          } else {
            console.log('📭 [COMMENT] No users in Subgraph result');
          }
        } catch (error) {
          console.error('❌ [COMMENT] Subgraph fetch failed:', error);
        }

        // Fetch from DataStream
        let datastreamUsers: any[] = [];
        if (isConnected) {
          try {
            const profiles = await readAllUserProfiles();
            if (profiles && profiles.length > 0) {
              datastreamUsers = profiles
                .filter((p: any) => p.username)
                .map((p: any) => ({
                  username: p.username,
                  displayName: p.displayName || p.username,
                  avatar: p.avatarHash || p.avatar || '',
                  isArtist: p.isArtist || false,
                  isVerified: p.isVerified || false,
                  userAddress: p.userAddress
                }));
            }
          } catch (error) {
            console.warn('⚠️ [COMMENT] DataStream fetch failed:', error);
          }
        }

        // Merge and deduplicate
        const userMap = new Map<string, any>();
        subgraphUsers.forEach(user => userMap.set(user.username.toLowerCase(), user));
        datastreamUsers.forEach(user => {
          const key = user.username.toLowerCase();
          if (!userMap.has(key)) userMap.set(key, user);
        });

        const mergedUsers = Array.from(userMap.values())
          .sort((a, b) => {
            if (a.isVerified && !b.isVerified) return -1;
            if (!a.isVerified && b.isVerified) return 1;
            if (a.isArtist && !b.isArtist) return -1;
            if (!a.isArtist && b.isArtist) return 1;
            return a.username.localeCompare(b.username);
          })
          .slice(0, 50);

        setAllUsers(mergedUsers);
        console.log(`✅ [COMMENT] Total users loaded: ${mergedUsers.length}`);
        
        if (mergedUsers.length === 0) {
          console.warn('⚠️ [COMMENT] No users loaded! Check Subgraph and DataStream');
        }
      } catch (error) {
        console.error('❌ [COMMENT] Failed to fetch users:', error);
        console.error('Error details:', error);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    // Fetch immediately
    fetchUsers();
  }, [isConnected, readAllUserProfiles]);

  // Filter users based on mention search
  const filteredUsers = useMemo(() => {
    if (!allUsers || allUsers.length === 0) return [];

    if (!mentionSearch) {
      // Show top 5 users (artists first)
      const artists = allUsers.filter(u => u.isArtist).slice(0, 3);
      const others = allUsers.filter(u => !u.isArtist).slice(0, 2);
      return [...artists, ...others];
    }

    return allUsers
      .filter(user => 
        user.username.toLowerCase().includes(mentionSearch.toLowerCase()) ||
        user.displayName.toLowerCase().includes(mentionSearch.toLowerCase())
      )
      .sort((a, b) => {
        const aExact = a.username.toLowerCase() === mentionSearch.toLowerCase();
        const bExact = b.username.toLowerCase() === mentionSearch.toLowerCase();
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        if (a.isArtist && !b.isArtist) return -1;
        if (!a.isArtist && b.isArtist) return 1;
        if (a.isVerified && !b.isVerified) return -1;
        if (!a.isVerified && b.isVerified) return 1;
        return 0;
      })
      .slice(0, 5);
  }, [allUsers, mentionSearch]);

  const handleTextChange = (newText: string) => {
    setCommentText(newText);

    // ⌨️ Update typing indicator
    const isTyping = newText.trim().length > 0;
    updateTyping(isTyping);

    const input = inputRef.current;
    if (input) {
      const cursorPos = input.selectionStart || 0;
      const textBeforeCursor = newText.substring(0, cursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');
      
      if (lastAtIndex !== -1) {
        const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
        if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
          setShowMentionSuggestions(true);
          setMentionSearch(textAfterAt);
          setMentionPosition(lastAtIndex);
          setSelectedMentionIndex(0);
        } else {
          setShowMentionSuggestions(false);
        }
      } else {
        setShowMentionSuggestions(false);
      }
    }
  };

  const selectMention = (username: string) => {
    const beforeMention = commentText.substring(0, mentionPosition);
    const afterCursor = commentText.substring(inputRef.current?.selectionStart || commentText.length);
    const newText = beforeMention + '@' + username + ' ' + afterCursor;
    
    setCommentText(newText);
    setShowMentionSuggestions(false);
    setMentionSearch('');
    
    setTimeout(() => {
      const input = inputRef.current;
      if (input) {
        const newCursorPos = beforeMention.length + username.length + 2;
        input.focus();
        input.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showMentionSuggestions && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => 
          prev < filteredUsers.length - 1 ? prev + 1 : prev
        );
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => prev > 0 ? prev - 1 : 0);
        return;
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        selectMention(filteredUsers[selectedMentionIndex].username);
        return;
      } else if (e.key === 'Tab') {
        e.preventDefault();
        selectMention(filteredUsers[selectedMentionIndex].username);
        return;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionSuggestions(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey && !showMentionSuggestions) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (commentText.trim() && !isSubmitting && !disabled) {
      const comment = commentText.trim();
      onSubmit(comment);
      setCommentText("");
      setShowMentionSuggestions(false);
      
      // 🔔 Send comment notification
      console.log('🔔 [COMMENT] Checking notification conditions:', {
        hasAddress: !!address,
        hasPostAuthor: !!postAuthor,
        hasPostId: !!postId,
        isSameUser: address && postAuthor ? address.toLowerCase() === postAuthor.toLowerCase() : false,
        address: address?.slice(0, 10),
        postAuthor: postAuthor?.slice(0, 10),
        postId
      });
      
      if (address && postAuthor && postId && address.toLowerCase() !== postAuthor.toLowerCase()) {
        try {
          console.log('🔔 [COMMENT] Sending comment notification...');
          const { notificationService } = await import('@/services/notificationService');
          await notificationService.notifyComment(address, postAuthor, postId, comment);
          console.log('✅ [COMMENT] Comment notification sent to:', postAuthor);
        } catch (error) {
          console.error('❌ [COMMENT] Failed to send comment notification:', error);
        }
      } else {
        console.log('⚠️ [COMMENT] Comment notification not sent - conditions not met');
      }
      
      // 🔔 Send mention notifications
      if (address && postId) {
        try {
          console.log('🔔 [COMMENT] Checking for mentions...');
          const { sendMentionNotifications } = await import('@/utils/mentionHelper');
          await sendMentionNotifications(comment, address, postId, allUsers);
          console.log('✅ [COMMENT] Mention notifications processed');
        } catch (error) {
          console.error('❌ [COMMENT] Failed to send mention notifications:', error);
        }
      }
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src={avatarUrl} alt={displayName} />
          <AvatarFallback className="text-xs">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 flex gap-2 relative">
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={commentText}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => updateTyping(false)}
            autoFocus={autoFocus}
            className="flex-1 px-3 py-2 bg-muted/50 border border-border/20 rounded-full text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={disabled || isSubmitting}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSubmit}
            disabled={!commentText.trim() || disabled || isSubmitting}
            className="px-3 rounded-full"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Mention Autocomplete Dropdown */}
      {showMentionSuggestions && (
        <div className="absolute z-50 mt-1 left-10 bg-popover border border-border rounded-lg shadow-lg max-w-xs w-full">
          {isLoadingUsers ? (
            <div className="py-4 text-center">
              <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Loading...</p>
            </div>
          ) : filteredUsers.length > 0 ? (
            <>
              <div className="py-1 max-h-48 overflow-y-auto">
                {filteredUsers.map((user, index) => (
                  <div
                    key={user.username}
                    className={`px-3 py-2 cursor-pointer flex items-center gap-2 ${
                      index === selectedMentionIndex 
                        ? 'bg-accent text-accent-foreground' 
                        : 'hover:bg-accent/50'
                    }`}
                    onClick={() => selectMention(user.username)}
                    onMouseEnter={() => setSelectedMentionIndex(index)}
                  >
                    <Avatar className="w-6 h-6 border border-border">
                      <AvatarImage 
                        src={user.avatar ? (
                          user.avatar.startsWith('http') 
                            ? user.avatar 
                            : `https://ipfs.io/ipfs/${user.avatar.replace('ipfs://', '')}`
                        ) : undefined}
                        alt={user.displayName}
                      />
                      <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                        {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : user.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-medium truncate">{user.displayName}</p>
                        {user.isVerified === true && (
                          <VerifiedBadge size="sm" />
                        )}
                        {user.isArtist === true && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-3.5 leading-none">🎵</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-3 py-1 border-t border-border bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  ↑↓ • Enter/Tab • Esc
                </p>
              </div>
            </>
          ) : (
            <div className="py-4 text-center px-4">
              {!isConnected ? (
                <>
                  <AlertCircle className="w-6 h-6 mx-auto mb-1 text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">Not connected</p>
                </>
              ) : allUsers.length === 0 ? (
                <>
                  <AtSign className="w-6 h-6 mx-auto mb-1 text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">No users yet</p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">No matches</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CommentInput;
