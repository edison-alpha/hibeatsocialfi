// Quest Admin Panel
// For admins to create custom quests

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { questService } from '@/services/questService';
import { createCustomQuest, type QuestTemplate, type QuestType, type QuestCategory } from '@/config/bxpQuests';
import { Plus, Save } from 'lucide-react';

export function QuestAdminPanel() {
  const [formData, setFormData] = useState<Partial<QuestTemplate>>({
    type: 'daily',
    category: 'listening',
    isRepeatable: true,
  });
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.id || !formData.title || !formData.targetValue || !formData.reward) {
      setMessage('❌ Please fill all required fields');
      return;
    }

    try {
      setCreating(true);
      setMessage('');

      // Create quest template
      const template: QuestTemplate = {
        id: formData.id!,
        type: formData.type as QuestType,
        category: formData.category as QuestCategory,
        title: formData.title!,
        description: formData.description || '',
        icon: formData.icon || '🎯',
        targetValue: formData.targetValue!,
        reward: formData.reward!,
        trackingKey: formData.trackingKey || 'total_activities',
        isRepeatable: formData.isRepeatable ?? true,
        duration: formData.duration,
      };

      // Add to templates
      createCustomQuest(template);

      setMessage('✅ Quest template created successfully!');
      
      // Reset form
      setFormData({
        type: 'daily',
        category: 'listening',
        isRepeatable: true,
      });
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Plus className="w-6 h-6" />
          <h2 className="text-2xl font-bold">Create Custom Quest</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quest ID */}
          <div className="space-y-2">
            <Label htmlFor="id">Quest ID *</Label>
            <Input
              id="id"
              placeholder="e.g., special_launch_week"
              value={formData.id || ''}
              onChange={(e) => handleChange('id', e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Unique identifier (lowercase, use underscores)
            </p>
          </div>

          {/* Quest Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Quest Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => handleChange('type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="special">Special Event</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => handleChange('category', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="listening">Listening</SelectItem>
                <SelectItem value="social">Social</SelectItem>
                <SelectItem value="creation">Creation</SelectItem>
                <SelectItem value="collection">Collection</SelectItem>
                <SelectItem value="community">Community</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Quest Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Music Marathon"
              value={formData.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="e.g., Listen to 50 songs this week"
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
            />
          </div>

          {/* Icon */}
          <div className="space-y-2">
            <Label htmlFor="icon">Icon (Emoji)</Label>
            <Input
              id="icon"
              placeholder="🎯"
              value={formData.icon || ''}
              onChange={(e) => handleChange('icon', e.target.value)}
              maxLength={2}
            />
          </div>

          {/* Target Value */}
          <div className="space-y-2">
            <Label htmlFor="targetValue">Target Value *</Label>
            <Input
              id="targetValue"
              type="number"
              placeholder="e.g., 50"
              value={formData.targetValue || ''}
              onChange={(e) => handleChange('targetValue', parseInt(e.target.value))}
              required
              min={1}
            />
            <p className="text-xs text-muted-foreground">
              Number of actions required to complete
            </p>
          </div>

          {/* Reward */}
          <div className="space-y-2">
            <Label htmlFor="reward">Reward (BXP) *</Label>
            <Input
              id="reward"
              type="number"
              placeholder="e.g., 500"
              value={formData.reward || ''}
              onChange={(e) => handleChange('reward', parseInt(e.target.value))}
              required
              min={1}
            />
          </div>

          {/* Tracking Key */}
          <div className="space-y-2">
            <Label htmlFor="trackingKey">Tracking Key *</Label>
            <Select
              value={formData.trackingKey}
              onValueChange={(value) => handleChange('trackingKey', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select tracking key" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="songs_played">Songs Played</SelectItem>
                <SelectItem value="songs_liked">Songs Liked</SelectItem>
                <SelectItem value="songs_shared">Songs Shared</SelectItem>
                <SelectItem value="posts_created">Posts Created</SelectItem>
                <SelectItem value="playlists_created">Playlists Created</SelectItem>
                <SelectItem value="songs_uploaded">Songs Uploaded</SelectItem>
                <SelectItem value="albums_created">Albums Created</SelectItem>
                <SelectItem value="nfts_collected">NFTs Collected</SelectItem>
                <SelectItem value="users_followed">Users Followed</SelectItem>
                <SelectItem value="social_actions">Social Actions</SelectItem>
                <SelectItem value="total_activities">Total Activities</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              What action to track for this quest
            </p>
          </div>

          {/* Repeatable */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isRepeatable"
              checked={formData.isRepeatable}
              onChange={(e) => handleChange('isRepeatable', e.target.checked)}
              className="w-4 h-4"
            />
            <Label htmlFor="isRepeatable" className="cursor-pointer">
              Repeatable (auto-recreate after completion)
            </Label>
          </div>

          {/* Duration (for special quests) */}
          {formData.type === 'special' && (
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (days)</Label>
              <Input
                id="duration"
                type="number"
                placeholder="e.g., 7"
                value={formData.duration ? formData.duration / (24 * 60 * 60 * 1000) : ''}
                onChange={(e) => handleChange('duration', parseInt(e.target.value) * 24 * 60 * 60 * 1000)}
                min={1}
              />
              <p className="text-xs text-muted-foreground">
                How long the quest is available (only for special quests)
              </p>
            </div>
          )}

          {/* Message */}
          {message && (
            <div className={`p-3 rounded-lg ${message.startsWith('✅') ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
              {message}
            </div>
          )}

          {/* Submit */}
          <Button type="submit" disabled={creating} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            {creating ? 'Creating...' : 'Create Quest Template'}
          </Button>
        </form>

        {/* Info */}
        <div className="p-4 bg-blue-500/10 rounded-lg text-sm">
          <p className="font-semibold mb-2">📝 Note:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Quest templates are created globally</li>
            <li>Users will automatically receive new quests</li>
            <li>Repeatable quests auto-recreate after completion</li>
            <li>Special quests have custom durations</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}
