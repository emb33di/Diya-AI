import { supabase } from '@/integrations/supabase/client';

export class ResumeActivitiesService {
  /**
   * Get all resume activities for the current user, organized by category
   */
  async getResumeData(): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    console.log('[RESUME_DEBUG] getResumeData called - fetching from database:', {
      userId: user?.id || 'unknown',
      timestamp: new Date().toISOString()
    });

    const { data, error } = await supabase
      .from('resume_activities_with_bullets')
      .select('*')
      .order('display_order');

    if (error) {
      console.error(`[RESUME_DEBUG] ResumeActivitiesService: Failed to fetch resume data - ${error.message}`, {
        userId: user?.id || 'unknown',
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to fetch resume data: ${error.message}`);
    }

    console.log('[RESUME_DEBUG] Raw data from database:', {
      userId: user?.id || 'unknown',
      dataLength: data?.length || 0,
      timestamp: new Date().toISOString(),
      rawActivities: data?.map((a: any) => ({
        id: a.id,
        category: a.category,
        title: a.title,
        display_order: a.display_order
      })) || []
    });

    if (!data) {
      console.log('[RESUME_DEBUG] No data returned from database, returning empty structure');
      return {
        academic: [],
        experience: [],
        leadership: [],
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
      leadership: [],
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

    console.log('[RESUME_DEBUG] ResumeActivitiesService: Successfully loaded and organized data:', {
      userId: user?.id || 'unknown',
      totalActivities: data.length,
      categories: Object.keys(resumeData),
      activityCounts: Object.entries(resumeData).reduce((acc, [key, value]) => {
        acc[key] = Array.isArray(value) ? value.length : 0;
        return acc;
      }, {} as Record<string, number>),
      allActivityIds: Object.entries(resumeData).flatMap(([key, value]) => 
        Array.isArray(value) ? value.map((v: any) => ({ category: key, id: v.id, title: v.title }))
        : []
      ),
      timestamp: new Date().toISOString()
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
      console.error(`ResumeActivitiesService: Failed to create activity "${activityData.title}" - ${error.message}`);
      throw new Error(`Failed to create activity: ${error.message}`);
    }

    if (!data) {
      console.error(`ResumeActivitiesService: No activity created - database returned no data for "${activityData.title}"`);
      throw new Error('No data returned from create activity');
    }

    const activity = data as any;
    console.log(`ResumeActivitiesService: Successfully created activity "${activity.title}" in category "${activity.category}"`);
    return activity;
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
      console.error(`ResumeActivitiesService: Failed to update activity ${activityId} - ${error.message}`);
      throw new Error(`Failed to update activity: ${error.message}`);
    }

    if (!data) {
      console.error(`ResumeActivitiesService: No activity updated - database returned no data for activity ${activityId}`);
      throw new Error('No data returned from update activity');
    }

    const activity = data as any;
    console.log(`ResumeActivitiesService: Successfully updated activity "${activity.title}"`);
    return activity;
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
      console.error(`ResumeActivitiesService: Failed to delete activity ${activityId} - ${error.message}`);
      throw new Error(`Failed to delete activity: ${error.message}`);
    }

    console.log(`ResumeActivitiesService: Successfully deleted activity ${activityId}`);
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
      console.error(`ResumeActivitiesService: Failed to create ${validBullets.length} bullets for activity ${activityId} - ${error.message}`);
      throw new Error(`Failed to create bullets: ${error.message}`);
    }

    console.log(`ResumeActivitiesService: Successfully created ${validBullets.length} bullets for activity ${activityId}`);
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
      console.error(`ResumeActivitiesService: Failed to delete existing bullets for activity ${activityId} - ${deleteError.message}`);
      throw new Error(`Failed to delete existing bullets: ${deleteError.message}`);
    }

    // Then create new bullets
    await this.createBullets(activityId, bullets);
    console.log(`ResumeActivitiesService: Successfully updated bullets for activity ${activityId} - ${bullets.length} bullets`);
  }

  /**
   * Save complete resume data (activities + bullets) using upsert logic
   */
  async saveResumeData(resumeData: any): Promise<void> {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    console.log(`ResumeActivitiesService: Starting resume data save for user ${user.id} - ${Object.keys(resumeData).length} categories`);

    // Get existing activities to compare
    const { data: existingActivities, error: fetchError } = await supabase
      .from('resume_activities')
      .select('*')
      .eq('user_id' as any, user.id as any);

    if (fetchError) {
      console.error(`ResumeActivitiesService: Failed to fetch existing activities for user ${user.id} - ${fetchError.message}`);
      throw new Error(`Failed to fetch existing activities: ${fetchError.message}`);
    }

    const existingActivitiesMap = new Map();
    if (existingActivities) {
      existingActivities.forEach((activity: any) => {
        existingActivitiesMap.set(activity.id, activity);
      });
    }

    const categories = Object.keys(resumeData) as string[];
    const processedActivityIds = new Set<string>();
    
    console.log(`ResumeActivitiesService: Processing ${categories.length} categories for user ${user.id} - found ${existingActivities?.length || 0} existing activities`);
    
    // Debug: Log all activities with location data
    categories.forEach(category => {
      const activities = resumeData[category] || [];
      activities.forEach((activity: any) => {
        if (activity.location && activity.location.trim() !== '') {
          console.log(`[RESUME_DEBUG] Backend received activity with location:`, {
            category,
            activityId: activity.id,
            title: activity.title,
            location: activity.location,
            userId: user.id
          });
        }
      });
    });
    
    for (const category of categories) {
      const activities = resumeData[category];
      
      if (!activities || !Array.isArray(activities)) {
        continue;
      }
      
      for (let i = 0; i < activities.length; i++) {
        const activity = activities[i];
        
        // Check if this is an existing activity (has a valid UUID-like ID that doesn't start with 'temp-')
        // Note: activity.id will be null for new activities (temp IDs are converted to null in useResumeEditor)
        const isExistingActivity = activity.id && typeof activity.id === 'string' && !activity.id.startsWith('temp-');
        
        if (isExistingActivity) {
          // Update existing activity
          const activityUpdate = {
            title: activity.title,
            position: activity.position,
            location: activity.location,
            from_date: activity.from_date,
            to_date: activity.to_date,
            is_current: activity.is_current,
            display_order: i
          };

          // Debug: Log location update
          if (activity.location && activity.location.trim() !== '') {
            console.log(`[RESUME_DEBUG] Updating activity with location in database:`, {
              activityId: activity.id,
              title: activity.title,
              location: activity.location,
              userId: user.id,
              updateData: activityUpdate
            });
          }

          console.log('[RESUME_DEBUG] Updating existing activity:', {
            userId: user.id,
            category,
            activityId: activity.id,
            title: activity.title,
            updateData: activityUpdate,
            timestamp: new Date().toISOString()
          });

          const { error: updateError } = await supabase
            .from('resume_activities')
            .update(activityUpdate as any)
            .eq('id' as any, activity.id as any)
            .eq('user_id' as any, user.id as any);

          if (updateError) {
            console.error(`[RESUME_DEBUG] ResumeActivitiesService: Failed to update activity ${activity.id} for user ${user.id} - ${updateError.message}`, {
              activityId: activity.id,
              updateData: activityUpdate,
              timestamp: new Date().toISOString()
            });
            throw new Error(`Failed to update activity: ${updateError.message}`);
          }

          console.log('[RESUME_DEBUG] Successfully updated activity:', {
            userId: user.id,
            category,
            activityId: activity.id,
            title: activity.title,
            timestamp: new Date().toISOString()
          });

          processedActivityIds.add(activity.id);

          // Update bullets
          if (activity.bullets && Array.isArray(activity.bullets)) {
            const bulletTexts = activity.bullets
              .map((bullet: any) => typeof bullet === 'string' ? bullet : bullet.bullet_text)
              .filter((text: string) => text && text.trim() !== '');
            await this.updateBullets(activity.id, bulletTexts);
          }
        } else {
          // Create new activity
          const activityInsert = {
            user_id: user.id,
            category: category,
            title: activity.title,
            position: activity.position,
            location: activity.location,
            from_date: activity.from_date,
            to_date: activity.to_date,
            is_current: activity.is_current,
            display_order: i
          };

          // Debug: Log location creation
          if (activity.location && activity.location.trim() !== '') {
            console.log(`[RESUME_DEBUG] Creating new activity with location in database:`, {
              category,
              title: activity.title,
              location: activity.location,
              userId: user.id,
              insertData: activityInsert
            });
          }

          const { data: createdActivity, error: activityError } = await supabase
            .from('resume_activities')
            .insert([activityInsert] as any)
            .select()
            .single();

          if (activityError) {
            console.error(`[RESUME_DEBUG] ResumeActivitiesService: Failed to create activity in category "${category}" for user ${user.id} - ${activityError.message}`, {
              category,
              insertData: activityInsert,
              timestamp: new Date().toISOString()
            });
            throw new Error(`Failed to create activity: ${activityError.message}`);
          }

          if (!createdActivity) {
            console.error(`[RESUME_DEBUG] ResumeActivitiesService: No activity created for user ${user.id} - database returned no data`, {
              category,
              insertData: activityInsert,
              timestamp: new Date().toISOString()
            });
            throw new Error('No activity created');
          }

          const createdActivityId = (createdActivity as any).id;
          console.log('[RESUME_DEBUG] Successfully created new activity:', {
            userId: user.id,
            category,
            oldTempId: activity.id,
            newDatabaseId: createdActivityId,
            title: activity.title,
            timestamp: new Date().toISOString()
          });

          processedActivityIds.add(createdActivityId);

          // Create bullets if they exist
          if (activity.bullets && Array.isArray(activity.bullets) && activity.bullets.length > 0) {
            const bulletTexts = activity.bullets
              .map((bullet: any) => typeof bullet === 'string' ? bullet : bullet.bullet_text)
              .filter((text: string) => text && text.trim() !== '');
            if (bulletTexts.length > 0) {
              await this.createBullets((createdActivity as any).id, bulletTexts);
            }
          }
        }
      }
    }
    
    // Delete activities that are no longer in the data
    const activitiesToDelete = Array.from(existingActivitiesMap.keys())
      .filter(id => !processedActivityIds.has(id));

    console.log('[RESUME_DEBUG] Checking for activities to delete:', {
      userId: user.id,
      existingActivityIds: Array.from(existingActivitiesMap.keys()),
      existingActivityDetails: Array.from(existingActivitiesMap.keys()).map(id => {
        const activity = existingActivitiesMap.get(id);
        return { id, category: activity?.category, title: activity?.title };
      }),
      processedActivityIds: Array.from(processedActivityIds),
      activitiesToDelete,
      activitiesToDeleteDetails: activitiesToDelete.map(id => {
        const activity = existingActivitiesMap.get(id);
        return { id, category: activity?.category, title: activity?.title };
      }),
      timestamp: new Date().toISOString()
    });

    if (activitiesToDelete.length > 0) {
      console.log('[RESUME_DEBUG] Deleting activities:', {
        userId: user.id,
        activityIdsToDelete: activitiesToDelete,
        count: activitiesToDelete.length,
        timestamp: new Date().toISOString()
      });

      const { error: deleteError } = await supabase
        .from('resume_activities')
        .delete()
        .eq('user_id' as any, user.id as any)
        .in('id' as any, activitiesToDelete);

      if (deleteError) {
        console.error(`[RESUME_DEBUG] ResumeActivitiesService: Failed to delete ${activitiesToDelete.length} activities for user ${user.id} - ${deleteError.message}`, {
          activityIdsToDelete: activitiesToDelete,
          timestamp: new Date().toISOString()
        });
        throw new Error(`Failed to delete removed activities: ${deleteError.message}`);
      }
      
      console.log(`[RESUME_DEBUG] ResumeActivitiesService: Successfully deleted ${activitiesToDelete.length} outdated activities for user ${user.id}`, {
        deletedActivityIds: activitiesToDelete,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('[RESUME_DEBUG] No activities to delete', {
        userId: user.id,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`ResumeActivitiesService: Successfully saved resume data for user ${user.id} - processed ${processedActivityIds.size} activities across ${categories.length} categories`);
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