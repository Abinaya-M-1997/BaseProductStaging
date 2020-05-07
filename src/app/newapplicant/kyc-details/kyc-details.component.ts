import { ActionSheetController } from '@ionic/angular';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

import { SqliteProvider } from './../../global/sqlite';
import { BarcodeScannerOptions, BarcodeScanner } from "@ionic-native/barcode-scanner/ngx";
import { OCR, OCRSourceType, OCRResult } from '@ionic-native/ocr/ngx';
import { FilePath } from '@ionic-native/file-path/ngx';
import { Camera, PictureSourceType } from '@ionic-native/camera/ngx';
import { MasterData } from './../masterservice';
import { FormControlData } from "../formcontrol";
import { HandlingError } from "../../utility/ErrorHandling";
import { KycScanAPI } from 'src/app/utility/kyc-scan-api';
import { Subject, Subscription } from 'rxjs';


@Component({
  selector: 'app-kyc-details',
  templateUrl: './kyc-details.component.html',
  styleUrls: ['./kyc-details.component.scss'],
})
export class KycDetailsComponent implements OnInit {

  kycDetails: FormGroup;
  kycProofType: any[];
  kycproofList: any[];
  errorMessage: any;
  hideScanOption: boolean = true;
  scanner: any;

  proofValueEmitted: Subscription;
  proofValueEmittedDL: Subscription;


  constructor(
    private formctrl: FormControlData,
    private sqlite: SqliteProvider,
    private master: MasterData,
    private errorHandling: HandlingError,
    private barcodeScanner: BarcodeScanner,
    private actionSheetCtrl: ActionSheetController,
    private ocr: OCR,
    private camera: Camera,
    private filePath: FilePath
  ) {
    // super(barcodeScanner);
    this.scanner = new KycScanAPI(this.barcodeScanner, actionSheetCtrl, ocr, camera, filePath, errorHandling);

  }

  ngOnInit() {
    this.kycDetails = this.formctrl.kycform();
    this.kycProofType = this.master.getKycProofType();
    this.kycproofList = this.master.getKycproofList();
    this.errorMessage = this.errorHandling.kycFormValidation();

  }

  ngAfterViewInit() {
    console.log('ngAfterViewInit');
    // this.sqlite.createtable("KYC_DETAILS", "kycId", Object.keys(this.master.getKycTable()), Object.values(this.master.getKycTable()));
  }

  kycSave(kycFormData) {

  }

  checkFilledStatus() {
    if (this.kycDetails.get('kycProofType').valid && this.kycDetails.get('kycIdType').valid)
      return true;
    else
      return false;
  }

  showScannerOption() {
    if (this.checkFilledStatus())
      this.hideScanOption = !this.hideScanOption;
    else
      this.errorHandling.chooseProofDocument();
  }

  calAPIMethods(scannerType) {
    this.hideScanOption = true;
    if (scannerType == '01') {
      this._qrScanner();
    } else {
      this._ocrScanner();
    }

  }

  _qrScanner() {
    this.scanner._QRScanner().then(data => {
      console.log(data, 'api');
      let qrResponse = this.scanner.formatQRResponse(data);
      this.kycDataBinding(qrResponse);
    }, err => {
      console.log(err);
      this.errorHandling.qrScannerErr();
    })
  }

  kycDataBinding(qrData) {
    let selecterProof = this.kycDetails.get('kycIdType').value;

    switch (selecterProof) {
      case "02":
        if (!!qrData.PrintLetterBarcodeData)
          this.kycDetails.get('kycIdvalue').setValue(qrData.PrintLetterBarcodeData._uid);
        else
          this.errorHandling.qrResFormatErr();
        break;
      case "05":
        var responseStr = qrData;
        let arr = responseStr.split(',');
        let DLNO = arr.filter(val => (val.toLowerCase().includes('dlno')))[0].split(':')[1];
        this.kycDetails.get('kycIdvalue').setValue(DLNO);
        break;
      default:
        this.errorHandling.kycNotMatchErr();
    }

  }

  setValidation() {
    //clear value., setDirectiveName for validation., set Min Max length
    this.kycDetails.get('kycIdvalue').reset();
  }

  /* Venkateshwari code */

  async _ocrScanner() {
    await this.scanner.selectSource(this.kycDetails.get('kycIdType').value);
    this.proofValueEmitted = this.scanner.proofValue.subscribe((data) => {
      this.kycDetails.get('kycIdvalue').setValue(data)
    })
    this.proofValueEmittedDL = this.scanner.proofValueDL.subscribe((data) => {
      if (data.dl_no1) { this.kycDetails.get('kycIdvalue').setValue(data.dl_no1) }
      else { this.kycDetails.get('kycIdvalue').setValue(data.dl_no2) }
    })
  }

  ngOnDestroy(){
    this.proofValueEmitted.unsubscribe();
    this.proofValueEmittedDL.unsubscribe();
  }


}
