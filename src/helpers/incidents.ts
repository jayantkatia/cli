import {dump, load} from 'js-yaml'
import {readFile, ensureFile, appendFile, writeFile} from 'fs-extra'
import path from 'path'
import {Incidents, MemoizedIncidents, UppConfig} from '../interfaces'
import slugify from '@sindresorhus/slugify'

let __memoizedIncidents: MemoizedIncidents | undefined

const initMemoizedIncidents = () => {
  if (__memoizedIncidents) return
  __memoizedIncidents = {} as MemoizedIncidents
}

export const getIncidents = async (): Promise<MemoizedIncidents> => {
  initMemoizedIncidents()
  if (__memoizedIncidents?.incidents) return __memoizedIncidents
  await ensureFile('.incidents.yml')
  let incidents = load(await readFile('.incidents.yml', 'utf8')) as Incidents
  if (!incidents) {
    incidents = {
      useID: 1,
      incidents: {},
    } as Incidents
    await writeFile('.incidents.yml', dump(incidents))
  }
  /** __memoizedIncidents is already initialized */
  __memoizedIncidents = {...incidents, indexes: {}}
  return __memoizedIncidents!
}

export const getIndexes = async (label: string): Promise<number[]> => {
  await getIncidents()
  if (__memoizedIncidents?.indexes[label]) return __memoizedIncidents?.indexes[label]
  const indexes: number[] = []
  Object.keys(__memoizedIncidents!.incidents).forEach(id => {
    if (__memoizedIncidents!.incidents[Number(id)].labels?.includes(label))
      indexes.push(Number(id))
  })
  __memoizedIncidents!.indexes[label] = indexes
  return indexes
}

export const createIncident = async (site: UppConfig['sites'][0], meta: {willCloseAt?: number; slug?: string; author: string; assignees: string[]; labels: string[]}, title: string, desc: string): Promise<void> => {
  const slug = meta.slug ?? site.slug ?? slugify(site.name)
  const incidents = await getIncidents()
  const id = incidents.useID
  const now = Date.now()
  // write to .incidents.yml
  incidents.incidents[id] = {
    siteURL: site.url,
    slug: slug,
    createdAt: now,
    willCloseAt: meta.willCloseAt,
    status: 'open',
    title,
    labels: meta.labels,
  }

  incidents.useID = id + 1
  meta.labels.forEach(label => {
    if (incidents.indexes[label])
      incidents.indexes[label].push(id)
  })

  __memoizedIncidents = incidents
  await writeFile('.incidents.yml', dump({
    useID: incidents.useID,
    incidents: incidents.incidents,
  }))

  // write to incidents/slugified-site-folder/$id-$title.md
  const mdPath = path.join('incidents', `${id}# ${title}.md`)
  await ensureFile(mdPath)
  const content = `---
id: ${id}
assignees: ${meta.assignees?.join(', ')}
labels: ${meta.labels.join(', ')}
---
# ${title}

<!--start:commment author:${meta.author} last_modified:${now}-->
${desc}
<!--end:comment -->
---
`
  await writeFile(mdPath, content)
}

export const closeMaintenanceIncidents = async () => {
  // Slug is not needed as a parameter, since newly added site will not have any issue
  // if it does, it must already be in .incidents.yml
  await getIncidents()
  const now = Date.now()
  const ongoingMaintenanceEvents: {incident: Incidents['incidents']['0']; id: number}[] = []
  const indexes = await getIndexes('maintenance')
  indexes.forEach(id => {
    const status = __memoizedIncidents!.incidents[id].status
    if (status === 'open') {
      const willCloseAt = __memoizedIncidents!.incidents[id].willCloseAt
      if (willCloseAt && willCloseAt < now) {
        __memoizedIncidents!.incidents[id].closedAt = now
        __memoizedIncidents!.incidents[id].status = 'closed'
      }
      ongoingMaintenanceEvents.push({
        id: id,
        incident: __memoizedIncidents!.incidents[id],
      })
    }
  })

  await writeFile('.incidents.yml', dump({
    useID: __memoizedIncidents?.useID,
    incidents: __memoizedIncidents?.incidents,
  }))
  return ongoingMaintenanceEvents
}

export const closeIncident = async (id: number) => {
  await getIncidents()
  __memoizedIncidents!.incidents[id].closedAt = Date.now()
  __memoizedIncidents!.incidents[id].status = 'closed'
  await writeFile('.incidents.yml', dump({
    useID: __memoizedIncidents?.useID,
    incidents: __memoizedIncidents?.incidents,
  }))
}

export const createComment = async (meta: {slug: string; id: number; title: string; author: string}, comment: string) => {
  const filePath = path.join('incidents', `${meta.id}# ${meta.title}.md`)
  await appendFile(filePath, `
<!--start:commment author:${meta.author} last_modified:${Date.now()}-->
${comment}
<!--end:comment --> 

---
`)
}
