/**
 * @file
 * Example 007: Get a document from an envelope
 * @author DocuSign
 */

const path = require('path')
    , docusign = require('docusign-esign')
    , dsConfig = require('../../config/index.js').config
    , validator = require('validator')
    ;

const eg007EnvelopeGetDoc = exports
    , eg = 'eg007' // This example reference.
    , mustAuthenticate = '/ds/mustAuthenticate'
    , minimumBufferMin = 3
    ;

/**
 * Get the envelope
 * @param {object} req Request obj
 * @param {object} res Response obj
 */
eg007EnvelopeGetDoc.createController = async (req, res) => {
    // Check the token
    // At this point we should have a good token. But we
    // double-check here to enable a better UX to the user.
    let tokenOK = req.dsAuth.checkToken(minimumBufferMin);
    if (! tokenOK) {
        req.flash('info', 'Sorry, you need to re-authenticate.');
        // Save the current operation so it will be resumed after authentication
        req.dsAuth.setEg(req, eg);
        res.redirect(mustAuthenticate);
    }
    let envelopeDocuments = req.session.envelopeDocuments;
    if (! req.session.envelopeId || ! envelopeDocuments ) {
        res.render('pages/examples/eg007EnvelopeGetDoc', {
            eg: eg, csrfToken: req.csrfToken(),
            title: "Download a document",
            envelopeOk: req.session.envelopeId,
            documentsOk: envelopeDocuments,
            sourceFile: path.basename(__filename),
            sourceUrl: dsConfig.githubExampleUrl + path.basename(__filename),
            documentation: dsConfig.documentation + eg,
            showDoc: dsConfig.documentation
        });
    }

    // Call the worker method
    let // Additional data validation might also be appropriate
        documentId = validator.escape(req.body.docSelect)
      , args = {
          accessToken: req.user.accessToken,
          basePath: req.session.basePath,
          accountId: req.session.accountId,
          documentId: documentId,
          envelopeDocuments: envelopeDocuments
        }
      , results = null
      ;

    try {
        results = await eg007EnvelopeGetDoc.worker (args)
    }
    catch (error) {
        let errorBody = error && error.response && error.response.body
            // we can pull the DocuSign error code and message from the response body
        , errorCode = errorBody && errorBody.errorCode
        , errorMessage = errorBody && errorBody.message
        ;
        // In production, may want to provide customized error messages and
        // remediation advice to the user.
        res.render('pages/error', {err: error, errorCode: errorCode, errorMessage: errorMessage});
    }
    if (results) {
        res.writeHead(200, {
            'Content-Type': results.mimetype,
            'Content-disposition': 'inline;filename=' + results.docName,
            'Content-Length': results.fileBytes.length
        });
        res.end(results.fileBytes, 'binary');
    }
}

/**
 * This function does the work of listing the envelope's recipients
 */
eg007EnvelopeGetDoc.worker = async (args) => {
    // Data for this method
    // args.basePath
    // args.accessToken
    // args.accountId
    // args.documentId
    // args.envelopeDocuments.envelopeId
    // args.envelopeDocuments.documents -- array of {documentId, name, type}

    // Step 2 start
    let dsApiClient = new docusign.ApiClient();
    dsApiClient.setBasePath(args.basePath);
    dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + args.accessToken);
    // Step 2 end
    // Step 3 start
    let envelopesApi = new docusign.EnvelopesApi(dsApiClient)
      , results = null;

    // EnvelopeDocuments::get.
    // Exceptions will be caught by the calling function
    results = await envelopesApi.getDocument(
        args.accountId, args.envelopeDocuments.envelopeId, args.documentId, null);
    // Step 3 end    

    let docItem = args.envelopeDocuments.documents.find(item => item.documentId === args.documentId)
      , docName = docItem.name
      , hasPDFsuffix = docName.substr(docName.length - 4).toUpperCase() === '.PDF'
      , pdfFile = hasPDFsuffix
      ;
    // Add .pdf if it's a content or summary doc and doesn't already end in .pdf
    if ((docItem.type === "content" || docItem.type === "summary") && !hasPDFsuffix){
        docName += ".pdf";
        pdfFile = true;
    }
    // Add .zip as appropriate
    if (docItem.type === "zip") {
        docName += ".zip"
    }

    // Return the file information
    // See https://stackoverflow.com/a/30625085/64904
    let mimetype;
    if (pdfFile) {
        mimetype = 'application/pdf'
    } else if (docItem.type === 'zip') {
        mimetype = 'application/zip'
    } else {
        mimetype = 'application/octet-stream'
    }

    return ({mimetype: mimetype, docName: docName, fileBytes: results});
}


/**
 * Form page for this application
 */
eg007EnvelopeGetDoc.getController = (req, res) => {
    // Check that the authentication token is ok with a long buffer time.
    // If needed, now is the best time to ask the user to authenticate
    // since they have not yet entered any information into the form.
    let tokenOK = req.dsAuth.checkToken();
    if (tokenOK) {
        let envelopeDocuments = req.session.envelopeDocuments,
            documentOptions;
        if (envelopeDocuments) {
            // Prepare the select items
            documentOptions = envelopeDocuments.documents.map ( item =>
                ({text: item.name, documentId: item.documentId}));
        }
        res.render('pages/examples/eg007EnvelopeGetDoc', {
            eg: eg, csrfToken: req.csrfToken(),
            title: "Download a document",
            envelopeOk: req.session.envelopeId,
            documentsOk: envelopeDocuments,
            documentOptions: documentOptions,
            sourceFile: path.basename(__filename),
            sourceUrl: dsConfig.githubExampleUrl + path.basename(__filename),
            documentation: dsConfig.documentation + eg,
            showDoc: dsConfig.documentation
        });
    } else {
        // Save the current operation so it will be resumed after authentication
        req.dsAuth.setEg(req, eg);
        res.redirect(mustAuthenticate);
    }
}
