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
      console.error(`ResumeActivitiesService: Failed to fetch resume data - ${error.message}`);
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

    console.log(`ResumeActivitiesService: Successfully loaded ${data.length} resume activities across ${Object.keys(resumeData).length} categories`);
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

    console.log(`ResumeActivitiesService: Successfully created activity "${data.title}" in category "${data.category}"`);
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
      console.error(`ResumeActivitiesService: Failed to update activity ${activityId} - ${error.message}`);
      throw new Error(`Failed to update activity: ${error.message}`);
    }

    if (!data) {
      console.error(`ResumeActivitiesService: No activity updated - database returned no data for activity ${activityId}`);
      throw new Error('No data returned from update activity');
    }

    console.log(`ResumeActivitiesService: Successfully updated activity "${data.title}"`);
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
    
    for (const category of categories) {
      const activities = resumeData[category];
      
      if (!activities || !Array.isArray(activities)) {
        continue;
      }
      
      for (let i = 0; i < activities.length; i++) {
        const activity = activities[i];
        
        // Check if this is an existing activity (has a valid UUID-like ID)
        const isExistingActivity = activity.id && typeof activity.id === 'string' && activity.id.includes('-');
        
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

          const { error: updateError } = await supabase
            .from('resume_activities')
            .update(activityUpdate as any)
            .eq('id' as any, activity.id as any)
            .eq('user_id' as any, user.id as any);

          if (updateError) {
            console.error(`ResumeActivitiesService: Failed to update activity ${activity.id} for user ${user.id} - ${updateError.message}`);
            throw new Error(`Failed to update activity: ${updateError.message}`);
          }

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

          const { data: createdActivity, error: activityError } = await supabase
            .from('resume_activities')
            .insert([activityInsert] as any)
            .select()
            .single();

          if (activityError) {
            console.error(`ResumeActivitiesService: Failed to create activity in category "${category}" for user ${user.id} - ${activityError.message}`);
            throw new Error(`Failed to create activity: ${activityError.message}`);
          }

          if (!createdActivity) {
            console.error(`ResumeActivitiesService: No activity created for user ${user.id} - database returned no data`);
            throw new Error('No activity created');
          }

          processedActivityIds.add((createdActivity as any).id);

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

    if (activitiesToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('resume_activities')
        .delete()
        .eq('user_id' as any, user.id as any)
        .in('id' as any, activitiesToDelete);

      if (deleteError) {
        console.error(`ResumeActivitiesService: Failed to delete ${activitiesToDelete.length} activities for user ${user.id} - ${deleteError.message}`);
        throw new Error(`Failed to delete removed activities: ${deleteError.message}`);
      }
      
      console.log(`ResumeActivitiesService: Successfully deleted ${activitiesToDelete.length} outdated activities for user ${user.id}`);
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