import { supabase } from '@/integrations/supabase/client';

export class ResumeActivitiesService {
  /**
   * Get all resume activities for the current user, organized by category
   */
  async getResumeData(): Promise<any> {
    const { data, error } = await supabase
      .from('resume_activities_with_bullets')
      .select('*')
      .order('display_order');

    if (error) {
      throw new Error(`Failed to fetch resume data: ${error.message}`);
    }

    if (!data) {
      return {
        academic: [],
        experience: [],
        projects: [],
        extracurricular: [],
        volunteering: [],
        skills: [],
        interests: [],
        languages: []
      };
    }

    // Organize data by category
    const resumeData: any = {
      academic: [],
      experience: [],
      projects: [],
      extracurricular: [],
      volunteering: [],
      skills: [],
      interests: [],
      languages: []
    };

    data.forEach((activity: any) => {
      const bullets = Array.isArray(activity.bullets) ? activity.bullets : [];
      const activityWithBullets = {
        ...activity,
        bullets
      };
      
      resumeData[activity.category].push(activityWithBullets);
    });

    return resumeData;
  }

  /**
   * Create a new resume activity
   */
  async createActivity(activityData: any): Promise<any> {
    const { data, error } = await supabase
      .from('resume_activities')
      .insert([activityData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create activity: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned from create activity');
    }

    return data;
  }

  /**
   * Update an existing resume activity
   */
  async updateActivity(activityId: string, updates: any): Promise<any> {
    const { data, error } = await supabase
      .from('resume_activities')
      .update(updates)
      .eq('id' as any, activityId as any)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update activity: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned from update activity');
    }

    return data;
  }

  /**
   * Delete a resume activity (bullets will be deleted automatically due to CASCADE)
   */
  async deleteActivity(activityId: string): Promise<void> {
    const { error } = await supabase
      .from('resume_activities')
      .delete()
      .eq('id' as any, activityId as any);

    if (error) {
      throw new Error(`Failed to delete activity: ${error.message}`);
    }
  }

  /**
   * Create bullet points for an activity
   */
  async createBullets(activityId: string, bullets: string[]): Promise<void> {
    // Filter out empty or null bullets
    const validBullets = bullets.filter(bullet => bullet && bullet.trim() !== '');
    if (validBullets.length === 0) return;

    const bulletInserts = validBullets.map((bulletText, index) => ({
      activity_id: activityId,
      bullet_text: bulletText,
      bullet_order: index
    }));

    const { error } = await supabase
      .from('resume_activity_bullets')
      .insert(bulletInserts as any);

    if (error) {
      throw new Error(`Failed to create bullets: ${error.message}`);
    }
  }

  /**
   * Update bullet points for an activity
   */
  async updateBullets(activityId: string, bullets: string[]): Promise<void> {
    // First, delete existing bullets
    const { error: deleteError } = await supabase
      .from('resume_activity_bullets')
      .delete()
      .eq('activity_id' as any, activityId as any);

    if (deleteError) {
      throw new Error(`Failed to delete existing bullets: ${deleteError.message}`);
    }

    // Then create new bullets
    await this.createBullets(activityId, bullets);
  }

  /**
   * Save complete resume data (activities + bullets) using upsert logic
   */
  async saveResumeData(resumeData: any): Promise<void> {
    console.log('🔍 [DEBUG] saveResumeData called with data:', JSON.stringify(resumeData, null, 2));
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    console.log('👤 [DEBUG] User ID:', user.id);

    // Get existing activities to compare
    console.log('📥 [DEBUG] Fetching existing activities...');
    const { data: existingActivities, error: fetchError } = await supabase
      .from('resume_activities')
      .select('*')
      .eq('user_id' as any, user.id as any);

    if (fetchError) {
      console.error('❌ [DEBUG] Failed to fetch existing activities:', fetchError);
      throw new Error(`Failed to fetch existing activities: ${fetchError.message}`);
    }

    console.log('📊 [DEBUG] Existing activities count:', existingActivities?.length || 0);
    console.log('📋 [DEBUG] Existing activities:', JSON.stringify(existingActivities, null, 2));

    const existingActivitiesMap = new Map();
    if (existingActivities) {
      existingActivities.forEach((activity: any) => {
        existingActivitiesMap.set(activity.id, activity);
      });
    }
    
    console.log('🗺️ [DEBUG] Existing activities map size:', existingActivitiesMap.size);

    const categories = Object.keys(resumeData) as string[];
    const processedActivityIds = new Set<string>();
    
    console.log('📂 [DEBUG] Processing categories:', categories);
    
    for (const category of categories) {
      const activities = resumeData[category];
      console.log(`📁 [DEBUG] Processing category '${category}' with ${activities?.length || 0} activities`);
      
      if (!activities || !Array.isArray(activities)) {
        console.log(`⚠️ [DEBUG] Category '${category}' has no activities or is not an array`);
        continue;
      }
      
      for (let i = 0; i < activities.length; i++) {
        const activity = activities[i];
        console.log(`🔍 [DEBUG] Processing activity ${i + 1}/${activities.length} in ${category}:`, JSON.stringify(activity, null, 2));
        
        // Check if this is an existing activity (has a valid UUID-like ID)
        const isExistingActivity = activity.id && typeof activity.id === 'string' && activity.id.includes('-');
        console.log(`🆔 [DEBUG] Activity ID: '${activity.id}', isExisting: ${isExistingActivity}`);
        
        if (isExistingActivity) {
          console.log(`✏️ [DEBUG] Updating existing activity: ${activity.id}`);
          // Update existing activity
          const activityUpdate = {
            title: activity.title,
            position: activity.position,
            from_date: activity.from_date,
            to_date: activity.to_date,
            is_current: activity.is_current,
            display_order: i
          };

          const { error: updateError } = await supabase
            .from('resume_activities')
            .update(activityUpdate as any)
            .eq('id' as any, activity.id as any)
            .eq('user_id' as any, user.id as any);

          if (updateError) {
            console.error(`❌ [DEBUG] Failed to update activity ${activity.id}:`, updateError);
            throw new Error(`Failed to update activity: ${updateError.message}`);
          }

          console.log(`✅ [DEBUG] Successfully updated activity: ${activity.id}`);
          processedActivityIds.add(activity.id);

          // Update bullets
          if (activity.bullets && Array.isArray(activity.bullets)) {
            const bulletTexts = activity.bullets
              .map((bullet: any) => typeof bullet === 'string' ? bullet : bullet.bullet_text)
              .filter((text: string) => text && text.trim() !== '');
            console.log(`📝 [DEBUG] Updating bullets for activity ${activity.id}:`, bulletTexts);
            await this.updateBullets(activity.id, bulletTexts);
          }
        } else {
          console.log(`➕ [DEBUG] Creating new activity in category: ${category}`);
          // Create new activity
          const activityInsert = {
            user_id: user.id,
            category: category,
            title: activity.title,
            position: activity.position,
            from_date: activity.from_date,
            to_date: activity.to_date,
            is_current: activity.is_current,
            display_order: i
          };

          const { data: createdActivity, error: activityError } = await supabase
            .from('resume_activities')
            .insert([activityInsert] as any)
            .select()
            .single();

          if (activityError) {
            console.error(`❌ [DEBUG] Failed to create activity:`, activityError);
            throw new Error(`Failed to create activity: ${activityError.message}`);
          }

          if (!createdActivity) {
            console.error(`❌ [DEBUG] No activity created - no data returned`);
            throw new Error('No activity created');
          }

          console.log(`✅ [DEBUG] Successfully created activity:`, (createdActivity as any).id);
          processedActivityIds.add((createdActivity as any).id);

          // Create bullets if they exist
          if (activity.bullets && Array.isArray(activity.bullets) && activity.bullets.length > 0) {
            const bulletTexts = activity.bullets
              .map((bullet: any) => typeof bullet === 'string' ? bullet : bullet.bullet_text)
              .filter((text: string) => text && text.trim() !== '');
            if (bulletTexts.length > 0) {
              console.log(`📝 [DEBUG] Creating bullets for new activity:`, bulletTexts);
              await this.createBullets((createdActivity as any).id, bulletTexts);
            }
          }
        }
      }
    }
    
    console.log(`🔄 [DEBUG] Processed activity IDs:`, Array.from(processedActivityIds));

    // Delete activities that are no longer in the data
    const activitiesToDelete = Array.from(existingActivitiesMap.keys())
      .filter(id => !processedActivityIds.has(id));

    console.log(`🗑️ [DEBUG] Activities to delete:`, activitiesToDelete);

    if (activitiesToDelete.length > 0) {
      console.log(`🗑️ [DEBUG] Deleting ${activitiesToDelete.length} activities that are no longer in the data`);
      const { error: deleteError } = await supabase
        .from('resume_activities')
        .delete()
        .eq('user_id' as any, user.id as any)
        .in('id' as any, activitiesToDelete);

      if (deleteError) {
        console.error(`❌ [DEBUG] Failed to delete activities:`, deleteError);
        throw new Error(`Failed to delete removed activities: ${deleteError.message}`);
      }
      
      console.log(`✅ [DEBUG] Successfully deleted ${activitiesToDelete.length} activities`);
    } else {
      console.log(`✅ [DEBUG] No activities to delete`);
    }
    
    console.log(`🎉 [DEBUG] saveResumeData completed successfully`);
  }

  /**
   * Reorder activities within a category
   */
  async reorderActivities(category: string, activityIds: string[]): Promise<void> {
    const updates = activityIds.map((id, index) => ({
      id,
      display_order: index
    }));

    for (const update of updates) {
      await this.updateActivity(update.id, { display_order: update.display_order });
    }
  }
}

// Export singleton instance
export const resumeActivitiesService = new ResumeActivitiesService();