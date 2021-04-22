import React, { useCallback, useEffect, useState } from 'react';
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { io } from 'socket.io-client';
import { useParams } from 'react-router-dom';

// milliseconds
const SAVE_INTERVAL = 2000;
// see Quill docs for options
const TOOLBAR_OPTIONS = [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    [{ font: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    ["bold", "italic", "underline"],
    [{ script: "sub" }, { script: "super" }],
    [{ align: [] }],
    ["image", "blockquote", "code-block"],
    ["clean"],
]

export default function TextEditor() {
    // deconstructed to grab the id from url search params
    const { id: documentId } = useParams();
    const [socket, setSocket] = useState();
    const [quill, setQuill] = useState();

    // makes connection to server
    useEffect(() => {
        const s = io("https://google-docs-clone-server.herokuapp.com/");
        setSocket(s);

        return () => {
            s.disconnect();
        }
    }, [])

    useEffect(() => {
        if (socket == null || quill == null) return;
        // listen to event once - cleans up after listening
        socket.once('load-document', document => {
            quill.setContents(document);
            quill.enable()
        })
        // tell server what document we are working on
        socket.emit('get-document', documentId);

    }, [socket, quill, documentId])

    // saves document
    useEffect(() => {
        if (socket == null || quill == null) return;

        const interval = setInterval(() => {
            socket.emit('save-document', quill.getContents());
        }, SAVE_INTERVAL)

        return () => {
            clearInterval(interval);
        }

    }, [socket, quill])

    //sends changes
    useEffect(() => {
        if (socket == null || quill == null) return;

        const handler = delta => {
            quill.updateContents(delta);
        }

        socket.on('receive-changes', handler)

        return () => {
            socket.off('receive-changes', handler)
        }
    }, [socket, quill])

    //detects changes
    useEffect(() => {
        if (socket == null || quill == null) return;

        const handler = (delta, oldDelta, source) => {
            if (source !== "user") return;
            socket.emit("send-changes", delta)
        }

        quill.on('text-change', handler)

        return () => {
            quill.off('text-change', handler)
        }
    }, [socket, quill])

    const wrapperRef = useCallback((wrapper) => {
        if (wrapper == null) return;

        wrapper.innerHTML = '';

        const editor = document.createElement('div');
        wrapper.append(editor);
        const q = new Quill(editor, { theme: "snow", modules: { toolbar: TOOLBAR_OPTIONS } })

        // can also use q.enable(false) instead of q.disable();
        q.disable()
        // loading text until server responds with the document
        q.setText('Loading...');

        setQuill(q);
    }, [])

    return (
        <div className="container" ref={wrapperRef} ></div>
    )
}
