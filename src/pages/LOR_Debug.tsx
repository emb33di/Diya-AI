import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuthContext } from '@/contexts/AuthContext'
import { LORService } from '@/services/lorService'

const LOR_Debug = () => {
  const [loading, setLoading] = useState(true)
  const { user } = useAuthContext()


  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)

        console.log('[PERU_DEBUG] Loading session...')
        const { data: { session } } = await supabase.auth.getSession()
        console.log('[PERU_DEBUG] Session:', session)


        console.log('[PERU_DEBUG] User ID:', user.id)

        console.log('[PERU_DEBUG] Loading LOR data...')

        const [recommendersData, deadlinesData, statsData, schoolOptionsData] = await Promise.all([
          LORService.getUserRecommenders(user.id),
          LORService.getUserLORDeadlines(user.id),
          LORService.getUserLORStats(user.id),
          LORService.getUserSchoolOptions(user.id)
        ]);

        console.log('[PERU_DEBUG] LOR data loaded:', {
          recommenders: recommendersData,
          deadlines: deadlinesData,
          stats: statsData,
          schoolOptions: schoolOptionsData
        })

      } catch (err) {
        console.error('[PERU_DEBUG] Failed to load LOR data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className='container mx-auto text-center bg-yellow-500'>
        <h1>LOR Debug Loding</h1>
      </div>
    )
  }

  return (
    <div className='container mx-auto text-center bg-green-500'>
      <h1>LOR Debug</h1>
    </div>
  )
}

export default LOR_Debug
