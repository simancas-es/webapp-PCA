
console.log("entry_PCMAIN")
console.log("2π = " + math.sum(math.pi, math.pi));




var UPLOADED_DATA;
var HEADERS;
var CHOSEN_SKIPPED_COLUMNS;
function choose_folder(item){
    UPLOADED_DATA= new Array(item.files.length);

    HEADERS=new Array(item.files.length);
    CHOSEN_SKIPPED_COLUMNS= new Array(item.files.length);

    for (let i=0;i<item.files.length;i++){//for (let file of item.files){   
        //usar closure en onload (f(v){..})(i)
        let file = item.files[i];
        
        var reader = new FileReader();
        reader.onload = function (e){
                                    (function (filen,file) {            
                                    console.log('file %s: '+file.name,i);       

                                    var text = e.target.result;
                                    var allLines = text.split(/\r\n|\n/);

                                    let headers=[];
                                    let data=[];
                                    //REMOVE HEADERS
                                    HEADERS[i]=allLines.shift().split('\t');

                                    //SAVA DATA IN A VARIABLE
                                    allLines.forEach(function (line) {
                                        data.push(line.split('\t'));

                                    });                                    
                                    UPLOADED_DATA[i]=data;

                                    //show headers and choose which one will be skipped
                                    CHOSEN_SKIPPED_COLUMNS[i]=[];
                                    
                                    divelem=document.getElementById("checkboxparty");
                                    let skpcol=populateCheckboxes(HEADERS[i],divelem,i,file.name);    
                                    })(i,file);
                                    };
        reader.readAsText(file, 'UTF-8');    

         
    }


}

function populateCheckboxes(arrayColumnNames, divelement,skippedcolumnsdataset,filename="filename:"){
    //pasarle el divelement donde van a ir las checkboxes
    //Depends on global CHOSEN_SKIPPED_COLUMNS 
    let paragraph = document.createElement('p');
    paragraph.innerText="Choose columns to skip (text mainly) from: "+filename+' >';
    for(let i=0;i<arrayColumnNames.length;i++){
        // <div>
        // <input type="checkbox" id="coding" name="interest" value="coding">
        // <label for="coding">Coding</label>
        // </div>
        // <div>
        // <input type="checkbox" id="cooking" name="interest" value="cooking">
        // <label for="cooking">Cooking</label>
        // </div>

        let checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.name = "column"; //all checkbox with same name to later get with getbyname
        checkbox.value = i;
        
        //add listener para que cuando se clickee se actualice el vector skipcolum
        //si se ha desactivado, lo borra (devuelve un array que no tenga esos valores)
        //si se ha activado, lo añade con un push

        //FUNCTION THAT CHANGES THE SKIPPED COLUMNS ARRAY
        let event_handler = (checkbox, skippedcolumnsdataset) =>{
            let colnum=checkbox.value;
            if(checkbox.checked){
                CHOSEN_SKIPPED_COLUMNS[skippedcolumnsdataset].push(parseInt(colnum));
                }
            else{
                //pisa el array antiguo con un array que no tenga estos valores
                CHOSEN_SKIPPED_COLUMNS[skippedcolumnsdataset] = CHOSEN_SKIPPED_COLUMNS[skippedcolumnsdataset].filter(function(value){value!=colnum;});
            }
        };
        checkbox.addEventListener('change',(function(ev){event_handler(checkbox,skippedcolumnsdataset)}))

        //SAVES CHECKBOX INTO A LABEL INTO A PARAGRAPH AND INTO THE DIV
        let label= document.createElement("label");
        label.appendChild(document.createTextNode(arrayColumnNames[i]));// nombre del header dentro del label
        label.appendChild(checkbox);   //pegar checkbox dentro de label (como hacer un for=id)
        //meter la label con el checkbox en el elemento
        paragraph.appendChild(label)
        

    }
    divelement.appendChild(paragraph);//ordenado
    
}
function calculate(item){
    if(UPLOADED_DATA==null || UPLOADED_DATA.length===0){console.log("MISSING DATA");return true;}
    console.log("Chosen skipped columns:",CHOSEN_SKIPPED_COLUMNS);


    let holdercolumnstatistics= new Array(UPLOADED_DATA.length); //[Dataset][Columna]: average,sd,z

    //iterate por cada dataset
    for (let dataseti=0;dataseti<UPLOADED_DATA.length;dataseti++){
            
        var SKIPPED_COLUMN_INDEX=CHOSEN_SKIPPED_COLUMNS[dataseti];
        var SKIPPED_COLUMNS=new Array(SKIPPED_COLUMN_INDEX.length);
        let skip_columns_actual_index=0;

        let numcols=UPLOADED_DATA[dataseti][0].length-SKIPPED_COLUMN_INDEX.length;
        holdercolumnstatistics[dataseti]= new Array(numcols); //columns in first entry
        let actualcol=0;

        //skip first column
        for(let columni=0;columni<UPLOADED_DATA[dataseti][0].length;columni++){

            //POPULATE COLUMNS
            let singlecolumn=[];
            if(SKIPPED_COLUMN_INDEX.includes(columni)){
                for (let entry=0;entry<UPLOADED_DATA[dataseti].length;entry++){
                    singlecolumn.push(UPLOADED_DATA[dataseti][entry][columni]);
                }
                SKIPPED_COLUMNS[skip_columns_actual_index]={'HEADER':HEADERS[dataseti][columni],'VALUES':singlecolumn};
                skip_columns_actual_index++;
            }else{
                for (let entry=0;entry<UPLOADED_DATA[dataseti].length;entry++){
                    //check and convert to int or abandon process
                    let insertvalue=UPLOADED_DATA[dataseti][entry][columni];
                    
                    
                    if (cleanNumbers(insertvalue)==null){
                        let alertmessage=`The dataset ${dataseti} column ${HEADERS[dataseti][columni]} has a non-number value in row ${entry}`
                        console.log(alertmessage);
                        alert(alertmessage);
                        return false;
                    }
                    singlecolumn.push(insertvalue);
                    }
            
                holdercolumnstatistics[dataseti][actualcol]=CalculateColumnStats(singlecolumn)//media std array
                holdercolumnstatistics[dataseti][actualcol]['HEADER']=HEADERS[dataseti][columni];
                actualcol++;
                }
        }

    

        //Calculate the covariance matrix with each pair of variables
        //using only the non-skipped columns
        let covariancematrix=new Array(numcols);
        for(let i=0;i<numcols;i++){
            covariancematrix[i]=new Array(numcols);
            for(let j=0;j<numcols;j++){
                covariancematrix[i][j]=calccovarianzaZ(holdercolumnstatistics[dataseti][i]['ZVALUES'],
                                                        holdercolumnstatistics[dataseti][j]['ZVALUES']);

            }
        }

        //EIGENVALUES
        let meigenvectors=math.eigs(covariancematrix);        
        let vecList=[];//Dictionary that will hold the eigenvalues and their components: {value:, vectors:}
        //Array de vectores ordenado
        for (let i = 0; i < meigenvectors['vectors'].length; i++) {
            vecList.push({'value': meigenvectors['values'][i], 'vector': meigenvectors['vectors'][i]});
        }
        vecList.sort(function(a, b) {
            return ((a.value < b.value) ? 1 : ((a.value == b.value) ? 0 : -1));
            }
        );

        

        //SUMMARY of eigenvalues for each component;
        //create a summary and print it into txt
        let PCnum=0;
        let txteigs="PCvector_number\tEigenvalue\tEigenvector\n"; 
        
        for(entry of vecList){
            txteigs+=PCnum+'\t'+entry['value']+'\t'+entry['vector'].toString()+'\n'
            PCnum++;
        }
        let linkhref = createtextFileURL(txteigs);
        let htmlDownloadLink=`<br><a href=${linkhref} download="DATASET_n_${dataseti}_EIGENVALUES_VECTORS.txt" id="downloadlink" style="display: block">DOWNLOAD DATASET #${dataseti} EIGENVALUES AND -VECTORS</a><br>`   ; 
        document.getElementById("downloadLinksZone").innerHTML += htmlDownloadLink;
        

        //LOADING VECTOR DATA
        let eigvectorsvertical=[];
        //stack all vectors in order
        let pcnum=0;
        let pcheader="";
        //add headers (variable names)        
        eigvectorsvertical.push([])
        for(let column of holdercolumnstatistics[dataseti]){
            let varheader=column['HEADER'];
            eigvectorsvertical[eigvectorsvertical.length-1].push(varheader);
        }
        for(let pc of vecList){
            eigvectorsvertical.push(math.dotMultiply(pc['vector'],math.sqrt(pc['value'])));
            pcheader+='\tPCvector_'+pcnum;
            pcnum++;
        }
        
        eigvectorsvertical=math.transpose(eigvectorsvertical); //load matrix en vertical Pc0,pc1,pc2...
        //save loading vectors in txt.

        let loadingfiletext="variable"+pcheader+'\n'
        for(row of eigvectorsvertical){
            for(subitem of row)
        {
            loadingfiletext+=subitem+'\t';
        }
        loadingfiletext+='\n'
        }
        linkhref = createtextFileURL(loadingfiletext);
        htmlDownloadLink=`<br><a href=${linkhref} download="DATASET_n_${dataseti} LOADING VECTORS MATRIX.txt" id="downloadlink" style="display: block">DOWNLOAD DATASET #${dataseti} LOADING VECTOR MATRIX</a><br>`   ; 
        document.getElementById("downloadLinksZone").innerHTML += htmlDownloadLink;


        //TRANSPOSE DATA: SC=originaldata · eigenvectors=([col1,col2])·[e1a e1b; e2a e2b]
        let transformedzDataset=[];
        //load columns in horizontal and then transpose
        for (i=0;i<holdercolumnstatistics[dataseti].length;i++){
            transformedzDataset[i]=holdercolumnstatistics[dataseti][i]['ZVALUES'];
        }
        //Gets all possible PC pairs
        let initPCindex=Array.from(Array(vecList.length).keys());
        let parejasindex= initPCindex.map( (valor,index)=>initPCindex.slice(index+1).map(subvalor=>[valor,subvalor])).flat()
        
        
        for([p1,p2] of parejasindex){
            //transformar zdata por cada pareja de vectores
            //crear un blob txt con url
            //poner la url en un link de descarga
            let twovectors=math.transpose(math.matrix([vecList[p1]['vector'],vecList[p2]['vector']]))
            //da el dataset con solo las variables PC1,PC2, pero las entradas se conservan en el orden.
            let transformedzDatasetPC=math.multiply(math.transpose(transformedzDataset),twovectors);
            //console.log("transformedzDataset:",transformedzDatasetPC);
            
            //Añadir las columnas no simlpificadas y headers
            let fileheaders=['PC_'+p1,'PC_'+p2];
            aux_transposed_result=math.transpose(transformedzDatasetPC);
            for(column of SKIPPED_COLUMNS){
                aux_transposed_result=math.concat(aux_transposed_result,[column['VALUES']],0);
                fileheaders.push(column['HEADER']);
            }
            let fulldataPCA=math.transpose(aux_transposed_result)
            //console.log("fulldataPCA:",fulldataPCA);
            textinhalt=marray_header_totext(fulldataPCA,fileheaders);
            let linkhref = createtextFileURL(textinhalt);
            let htmlDownloadLink=`<br><a href=${linkhref} download="DATASET_n_${dataseti}_PCpair_${p1}_${p2}.txt" id="downloadlink" style="display: block">Download Dataset #${dataseti}-PC pair_${p1}_${p2}</a><br>`   ; 
            document.getElementById("downloadLinksZone").innerHTML += htmlDownloadLink;
        
        }
    }      //end of dataset calculation
}

function cleanNumbers(valor){
    if(typeof valor === 'string'){
        try{
            numero_saneado= parseFloat(valor.trim());
            return numero_saneado
        }catch(error){
            console.log("Value is not numbers")
            console.error(error);}
    }else{
        return valor;
    }   
    return null;
}

function marray_header_totext(dataarray,headerarray,delimitator='\t'){
    let cadena="";
    for (header of headerarray){
        cadena+=header+delimitator;
    }
    cadena+='\n';
    sizedata=math.size(dataarray).valueOf(); //0 rows, 1 columns
    for(row=0;row<sizedata[0];row++){
        for(subitem of dataarray.toArray()[row])
        {
            cadena+=subitem+delimitator;
        }
        cadena+='\n';
    }
    return cadena;
}
function createtextFileURL (textinhalt) {
    var textFile = null;

    var data = new Blob([textinhalt], {type: 'text/plain'});

    // If we are replacing a previously generated file we need to
    // manually revoke the object URL to avoid memory leaks.
    if (textFile !== null) {
        window.URL.revokeObjectURL(textFile);
    }

    //Crear object URL desde BLOB
    textFile = window.URL.createObjectURL(data);    
    return textFile;

    
    
    }
function CalculateColumnStats(arrayn){
    //should receive array [4,4,4,1,2,3,5,6,6,7] f ex
    //calculate statistical data for each column

    for(let i=0;i<arrayn.length;i++){
        arrayn[i]=parseFloat(arrayn[i]);
    }
    
    let columnstats= {};
    let average=calcaverage(arrayn);
    let sd=calcstandarddeviation(arrayn,average);
    let Zvalues=calcZarray(arrayn,average,sd);

    columnstats={'AVERAGE':average,'STDEV':sd,'ZVALUES':Zvalues};
    
    return columnstats;
}
function calcaverage(numbers){
    let sum=0.0;
    for (let num of numbers){
        sum+=num;        
    }
    return sum/numbers.length;
}
function calcstandarddeviation(numbers,average){
    let sum=0.0;
    for(let num of numbers){
        sum+=Math.abs(num-average)**2;
    }
    return (sum/(numbers.length-1))**0.5;
}
function calccovarianza(numbersx,averagex,numbersy,averagey){
    if(numbersx.length!=numbersy.length){
        console.log("non matching dimensions!!");
    }
    let sum=0.0;
    let numberentries=Math.min(numbersx.length,numbersy.length)
    for (let i=0;i<numberentries;i++){
        sum+=(numbersx[i]-averagex)*(numberxy[i]-averagey);
    }
    return sum/(numberentries);//unsure if n or n-1
}
function calccovarianzaZ(numbersx,numbersy){
    if(numbersx.length!=numbersy.length){
        console.log("non matching dimensions!!");
    }
    let sum=0.0;
    let numberentries=Math.min(numbersx.length,numbersy.length)
    for (let i=0;i<numberentries;i++){
        sum+=(numbersx[i])*(numbersy[i]);
    }
    return sum/(numberentries);//unsure if n or n-1
}
function calcZarray(numbers,average,standarddeviation){

    for(let i=0;i<numbers.length;i++){
        numbers[i]=(numbers[i]-average)/standarddeviation;
    }
    return numbers;
}