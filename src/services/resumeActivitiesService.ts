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
   * Save complete resume data (activities + bullets)
   */
  async saveResumeData(resumeData: any): Promise<void> {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Clear existing data
    const { error: deleteError } = await supabase
      .from('resume_activities')
      .delete()
      .eq('user_id' as any, user.id as any);

    if (deleteError) {
      throw new Error(`Failed to clear existing data: ${deleteError.message}`);
    }

    // Insert new data
    const categories = Object.keys(resumeData) as string[];
    
    for (const category of categories) {
      const activities = resumeData[category];
      
      for (let i = 0; i < activities.length; i++) {
        const activity = activities[i];
        
        // Create activity
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
          throw new Error(`Failed to create activity: ${activityError.message}`);
        }

        if (!createdActivity) {
          throw new Error('No activity created');
        }

        // Create bullets if they exist
        if (activity.bullets && Array.isArray(activity.bullets) && activity.bullets.length > 0) {
          const bulletTexts = activity.bullets
            .map((bullet: any) => bullet.bullet_text)
            .filter((text: string) => text && text.trim() !== '');
          if (bulletTexts.length > 0) {
            await this.createBullets((createdActivity as any).id, bulletTexts);
          }
        }
      }
    }
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