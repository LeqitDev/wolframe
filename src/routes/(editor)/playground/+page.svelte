<script lang="ts">
	import { getEditorManager } from "$lib/backend/stores/editor.svelte";
	import eventController from "@/lib/backend/events";
	import monacoController from "@/lib/backend/monaco";
	import { getVirtualFileSystem } from "@/lib/backend/stores/vfs.svelte";
	import { debug } from "@/lib/backend/utils";

    const editorManager = getEditorManager();

    const vfs = getVirtualFileSystem();

    function onMonacoLoaded() {
        debug('info', 'vfs', "Monaco loaded, adding files");
        vfs.addFile("template.typ", `#let month_names = ("January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December")

#let date = {
  let date = datetime.today()
  let month = month_names.at(date.month() - 1)
  [#month #date.display("[day], [year]")]
}

#let checkbox(finished: false, body) = {
  grid(
    columns: 2,
    column-gutter: 5pt,
    box(
      stroke: 1pt + black,
      radius: .5pt,
      width: 8pt,
      height: 8pt,
      if finished {
        place(
          dy: -4.25pt,
          dx: .75pt,
          [X]
        )
      }
    ),
    body
  )
}

#let how-hard(x) = {
  [*Es war einfach die Aufgaben zu lösen:*]
  grid(
    columns: (1fr, 1fr, 1fr, 1fr, 1fr),
    checkbox(finished: x == 1)[Stimmen\ voll zu],
    checkbox(finished: x == 2)[Stimmen teilweise zu],
    checkbox(finished: x == 3)[Neutral],
    checkbox(finished: x == 4)[Stimmen teilweise nicht zu],
    checkbox(finished: x == 5)[Stimmen gar nicht zu]
  )
}

#let filterRecursively(obj, filter) = {
  if obj.has("children") {
    let filtered = obj.children.map(child => filterRecursively(child, filter)).filter(child => {
      not repr(child).split("(").at(0) in filter
    })
    [
      #for el in filtered {el}
    ]
  } else if obj.has("description") {
    filterRecursively(obj.description, filter)
  } else {
    obj
  }
}

#let conf(assignment, asn, names, difficulty, hideFiguresAndOutput: false, doc) = {
  set page(
    paper: "a4",
    margin: (x: 2.27in/2, y: 3.69in/2),
    numbering: "1"
  )
  set text(font: "New Computer Modern")

  align(center)[
    #set text(size: 17.28pt)
    Practical Internet eXperience\
    Assignment #assignment\ \
    #set text(size: 12pt, top-edge: .3em)
    #for name in names {
      [#name\ ]
    }
    ASN: #asn\ \
    #date
  ]
  set text(size: 10pt, top-edge: "cap-height")

  how-hard(difficulty)

  set heading(numbering: "1")

  if hideFiguresAndOutput {
    filterRecursively(doc, ("raw", "figure", "image"))
  } else {
    doc
  }
}

#let task_number = state("t-nr", (0, 1))

#let task(top, sub, body) = {
  task_number.update(nr => (top, sub))
  [= #h(10pt) Task #top.#sub]
  v(5pt)
  body
}

#let next-subtask(body) = {
  task_number.update(nr => (nr.at(0), nr.at(1) + 1))
  [= #h(10pt) Task #context task_number.get().map(x => str(x)).join(".")]
  v(5pt)
  body
}

#let next-task(body) = {
  task_number.update(nr => (nr.at(0) + 1, 1))
  [= #h(10pt) Task #context task_number.get().map(x => str(x)).join(".")]
  v(5pt)
  body
}

#let strong-enums(offset: 0, ..body) = enum(numbering: (it) => strong(numbering("a)", it + offset)),..body)`);
        vfs.addFile("main.typ", "Hello *Typst*!");

        eventController.fire("files:loaded");
    }

    function onEditorCreated() {
        debug('info', 'editor', "Editor created, resolving loading editor");
        editorManager.resolveLoadingEditor?.();
    }

    $effect(() => {
        eventController.register("monaco:loaded", onMonacoLoaded)
        eventController.register("monaco/editor:created", onEditorCreated)

        /* if (monacoController.isEditorAlreadyCreated()) {
            console.log("Editor already created, firing event");
            eventController.fire("monaco/editor:created");
        } */
        /* setTimeout(() => {
            const folderResult = vfs.addFile("test", null);
            if (folderResult.ok) {
                vfs.addFile("test2.txt", "", folderResult.value.file.id);
                vfs.addFile("test3.txt", "", folderResult.value.file.id);
                vfs.addFile("test4.txt", "", folderResult.value.file.id);
                vfs.addFile("test5.txt", "", folderResult.value.file.id);
            }
        }, 0); */

        return () => {
            eventController.unregister("monaco:loaded", onMonacoLoaded)
            eventController.unregister("monaco/editor:created", onEditorCreated)
        }
    })
</script>